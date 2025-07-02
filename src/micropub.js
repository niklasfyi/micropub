import dotenv from 'dotenv'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import httpMultipartBodyParser from '@middy/http-multipart-body-parser'
import httpUrlEncodeBodyParser from '@middy/http-urlencode-body-parser'
import jsonBodyParser from '@middy/http-json-body-parser'

dotenv.config()

import auth from './libs/auth'
import source from './libs/source'
import publish from './libs/publish'
import { Error, Response } from './libs/response'
import { parseSyndicationTargets } from './libs/config'
import logger from './libs/logger'

const getHandler = async (query) => {
	let res
	const syndicateTo = parseSyndicationTargets(process.env.SYNDICATE_TO) || []

	logger.logAction('micropub_get_query', {
		query: query.q,
		hasUrl: !!query.url,
	})

	if (query.q === 'config') {
		logger.info('Serving config query')
		return Response.send(200, {
			'media-endpoint':
        process.env.MEDIA_ENDPOINT ||
        `${process.env.URL || ''}/.netlify/functions/media`,
			'syndicate-to': syndicateTo,
		})
	} else if (query.q === 'source' && query.url) {
		logger.info('Serving source query', {
			url: query.url,
			properties: query.properties || query['properties[]'],
		})
		res = await source.get(
			query.url,
			query.properties || query['properties[]'],
		)
		if (res && res.source) {
			logger.info('Source found successfully')
			return Response.send(200, res.source)
		}
		logger.warn('Source not found', {
			url: query.url,
			error: res && res.error,
		})
	} else if (query.q === 'syndicate-to') {
		logger.info('Serving syndicate-to query')
		return Response.send(200, {
			'syndicate-to': syndicateTo,
		})
	}

	logger.warn('Invalid GET request', { query, error: res && res.error })
	return Response.error(Error.INVALID, res && res.error)
}

const micropubFn = async (event) => {
	const startTime = Date.now()

	// Log incoming request
	logger.logRequest(event, 'micropub')

	if (!['GET', 'POST'].includes(event.httpMethod)) {
		logger.warn('Method not allowed', { method: event.httpMethod })
		const response = Response.error(Error.NOT_ALLOWED)
		logger.logResponse(
			response.statusCode,
			response.body,
			'micropub',
			Date.now() - startTime,
		)
		return response
	}

	const { headers, body } = event

	try {
		const authResponse = await auth.isAuthorized(headers, body)

		if (!authResponse || authResponse.error) {
			logger.logAuth(false, null, null, authResponse && authResponse.error)
			const response = Response.error(authResponse)
			logger.logResponse(
				response.statusCode,
				response.body,
				'micropub',
				Date.now() - startTime,
			)
			return response
		}

		// eslint-disable-next-line camelcase
		const { client_id, scope } = authResponse
		logger.logAuth(true, client_id, scope)

		if (event.httpMethod === 'GET') {
			logger.info('Processing GET request')
			const response = await getHandler(event.queryStringParameters)
			logger.logResponse(
				response.statusCode,
				response.body,
				'micropub',
				Date.now() - startTime,
			)
			return response
		}

		const action = (body.action || 'create').toLowerCase()
		logger.logAction('micropub_action', { action, client_id, scope })

		if (!scope || !auth.isValidScope(scope, action)) {
			logger.warn('Invalid scope for action', { scope, action, client_id })
			const response = Response.error(Error.SCOPE)
			logger.logResponse(
				response.statusCode,
				response.body,
				'micropub',
				Date.now() - startTime,
			)
			return response
		}

		let res
		const isJson =
      headers['content-type'] &&
      headers['content-type'].indexOf('application/json') >= 0

		if (action == 'create') {
			logger.info('Creating content', { client_id, isJson, hasBody: !!body })
			res = await publish.addContent(body, isJson, client_id)
		} else if (action == 'update') {
			logger.info('Updating content', { url: body.url, client_id })
			res = await publish.updateContent(body.url, body)
		} else if (action == 'delete') {
			logger.info('Deleting content', {
				url: body.url,
				permanent: !!process.env.PERMANENT_DELETE,
			})
			res = await publish.deleteContent(body.url, process.env.PERMANENT_DELETE)
		} else if (action == 'undelete') {
			logger.info('Undeleting content', { url: body.url })
			res = await publish.undeleteContent(body.url)
		} else {
			logger.warn('Unsupported action', { action, client_id })
			const response = Response.error(Error.NOT_SUPPORTED)
			logger.logResponse(
				response.statusCode,
				response.body,
				'micropub',
				Date.now() - startTime,
			)
			return response
		}

		if (res && res.filename) {
			logger.info('Action completed successfully', {
				action,
				filename: res.filename,
				client_id,
				duration: `${Date.now() - startTime}ms`,
			})

			let response
			if (action == 'create') {
				response = Response.sendLocation(`${process.env.ME}${res.filename}`)
			} else {
				response = Response.send(204)
			}
			logger.logResponse(
				response.statusCode,
				response.body,
				'micropub',
				Date.now() - startTime,
			)
			return response
		}

		logger.error('Action failed', res && res.error, {
			action,
			client_id,
			result: res,
		})
		const response = Response.error(Error.INVALID, res && res.error)
		logger.logResponse(
			response.statusCode,
			response.body,
			'micropub',
			Date.now() - startTime,
		)
		return response
	} catch (error) {
		logger.error('Unexpected error in micropub handler', error, {
			method: event.httpMethod,
			duration: `${Date.now() - startTime}ms`,
		})
		const response = Response.error(Error.INVALID, 'Internal server error')
		logger.logResponse(
			response.statusCode,
			response.body,
			'micropub',
			Date.now() - startTime,
		)
		return response
	}
}

const handler = middy(micropubFn)
	.use(jsonBodyParser()) // application/json
	.use(httpMultipartBodyParser()) // multipart/form-data
	.use(httpUrlEncodeBodyParser()) // application/x-www-form-urlencoded
	.use(httpErrorHandler())

export { handler }
