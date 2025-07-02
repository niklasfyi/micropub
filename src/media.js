import dotenv from 'dotenv'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import httpMultipartBodyParser from '@middy/http-multipart-body-parser'

dotenv.config()

import auth from './libs/auth'
import content from './libs/content'
import GitHub from './libs/github'
import { Error, Response } from './libs/response'
import logger from './libs/logger'

const getHandler = async (query) => {
	let res

	logger.logAction('media_get_query', {
		query: query.q,
		limit: query.limit,
		offset: query.offset,
	})

	if (query.q === 'source') {
		// https://github.com/indieweb/micropub-extensions/issues/14
		const opts = {
			limit: parseInt(query.limit) || 10,
			offset: parseInt(query.offset) || 0,
			url: process.env.MEDIA_DIR || 'uploads',
		}

		logger.info('Fetching media directory', opts)
		const exists = await GitHub.getDirectory(opts.url)

		if (!exists) {
			res = { error: 'directory does not exist' }
			logger.warn('Media directory does not exist', { url: opts.url })
		} else if (exists.files) {
			let items = []
			for (let file of exists.files) {
				items.push({ url: `${process.env.ME}${file.path}` })
			}
			// Since `url` should start with timestamp, sort by `url` and first item should be the newest
			items.sort((a, b) => (a.url < b.url ? 1 : a.url > b.url ? -1 : 0))
			items = items.slice(opts.offset, opts.offset + opts.limit)

			logger.info('Media directory fetched successfully', {
				totalFiles: exists.files.length,
				returnedItems: items.length,
				limit: opts.limit,
				offset: opts.offset,
			})

			return Response.send(200, {
				items: items,
				count: items.length,
				total: exists.files.length,
			})
		}
	}

	logger.warn('Invalid media GET request', { query, error: res && res.error })
	return Response.error(Error.INVALID, res && res.error)
}

const mediaFn = async (event) => {
	const startTime = Date.now()

	// Log incoming request
	logger.logRequest(event, 'media')

	if (!['GET', 'POST'].includes(event.httpMethod)) {
		logger.warn('Method not allowed on media endpoint', {
			method: event.httpMethod,
		})
		const response = Response.error(Error.NOT_ALLOWED)
		logger.logResponse(
			response.statusCode,
			response.body,
			'media',
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
				'media',
				Date.now() - startTime,
			)
			return response
		}

		const { scope } = authResponse
		logger.logAuth(true, authResponse.client_id, scope)

		if (event.httpMethod === 'GET') {
			logger.info('Processing GET request on media endpoint')
			const response = await getHandler(event.queryStringParameters)
			logger.logResponse(
				response.statusCode,
				response.body,
				'media',
				Date.now() - startTime,
			)
			return response
		}

		const action = (body.action || 'media create').toLowerCase()
		logger.logAction('media_action', {
			action,
			client_id: authResponse.client_id,
			scope,
		})

		if (!scope || !auth.isValidScope(scope, action)) {
			logger.warn('Invalid scope for media action', {
				scope,
				action,
				client_id: authResponse.client_id,
			})
			const response = Response.error(Error.SCOPE)
			logger.logResponse(
				response.statusCode,
				response.body,
				'media',
				Date.now() - startTime,
			)
			return response
		}

		const file = body.file || body.photo
		if (file && file.filename) {
			logger.info('Uploading media file', {
				filename: file.filename,
				mimeType: file.mimeType,
				size: file.content ? file.content.length : 'unknown',
				client_id: authResponse.client_id,
			})

			const filename = content.mediaFilename(file)
			const uploaded = await GitHub.uploadImage(filename, file)

			if (uploaded) {
				logger.info('Media upload successful', {
					originalFilename: file.filename,
					uploadedPath: uploaded,
					client_id: authResponse.client_id,
					duration: `${Date.now() - startTime}ms`,
				})
				const response = Response.sendLocation(
					`${process.env.ME}${uploaded}`,
					true,
				)
				logger.logResponse(
					response.statusCode,
					response.body,
					'media',
					Date.now() - startTime,
				)
				return response
			} else {
				logger.error('Media upload failed', null, {
					filename: file.filename,
					client_id: authResponse.client_id,
				})
			}
		} else {
			logger.warn('No valid file provided for media upload', {
				hasFile: !!body.file,
				hasPhoto: !!body.photo,
				fileHasFilename: !!(body.file && body.file.filename),
				photoHasFilename: !!(body.photo && body.photo.filename),
				client_id: authResponse.client_id,
			})
		}

		const response = Response.error(Error.INVALID)
		logger.logResponse(
			response.statusCode,
			response.body,
			'media',
			Date.now() - startTime,
		)
		return response
	} catch (error) {
		logger.error('Unexpected error in media handler', error, {
			method: event.httpMethod,
			duration: `${Date.now() - startTime}ms`,
		})
		const response = Response.error(Error.INVALID, 'Internal server error')
		logger.logResponse(
			response.statusCode,
			response.body,
			'media',
			Date.now() - startTime,
		)
		return response
	}
}

const handler = middy(mediaFn)
	.use(httpMultipartBodyParser())
	.use(httpErrorHandler())

export { handler }
