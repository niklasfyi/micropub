const logger = {
	info: (message, data = {}) => {
		const timestamp = new Date().toISOString()
		const logEntry = {
			timestamp,
			level: 'INFO',
			message,
			...data
		}
		console.log(JSON.stringify(logEntry))
	},

	error: (message, error = null, data = {}) => {
		const timestamp = new Date().toISOString()
		const logEntry = {
			timestamp,
			level: 'ERROR',
			message,
			error: error ? {
				name: error.name,
				message: error.message,
				stack: error.stack
			} : null,
			...data
		}
		console.error(JSON.stringify(logEntry))
	},

	warn: (message, data = {}) => {
		const timestamp = new Date().toISOString()
		const logEntry = {
			timestamp,
			level: 'WARN',
			message,
			...data
		}
		console.warn(JSON.stringify(logEntry))
	},

	logRequest: (event, endpoint = 'micropub') => {
		const timestamp = new Date().toISOString()
		const { httpMethod, headers, queryStringParameters, body, pathParameters } = event

		// Sanitize headers to avoid logging sensitive information
		const sanitizedHeaders = { ...headers }
		if (sanitizedHeaders.authorization) {
			sanitizedHeaders.authorization = '[REDACTED]'
		}

		// Sanitize body to avoid logging sensitive data like tokens
		let sanitizedBody = body
		if (typeof body === 'object' && body !== null) {
			sanitizedBody = { ...body }
			if (sanitizedBody.access_token) {
				sanitizedBody.access_token = '[REDACTED]'
			}
		}

		const requestData = {
			timestamp,
			level: 'INFO',
			message: `Incoming ${httpMethod} request to ${endpoint}`,
			endpoint,
			method: httpMethod,
			headers: sanitizedHeaders,
			query: queryStringParameters,
			body: sanitizedBody,
			path: pathParameters,
			userAgent: headers['user-agent'],
			contentType: headers['content-type'],
			origin: headers.origin || headers.referer
		}

		console.log(JSON.stringify(requestData))
	},

	logResponse: (statusCode, response, endpoint = 'micropub', duration = null) => {
		const timestamp = new Date().toISOString()

		// Sanitize response to avoid logging sensitive data
		let sanitizedResponse = response
		if (typeof response === 'object' && response !== null) {
			sanitizedResponse = { ...response }
			if (sanitizedResponse.access_token) {
				sanitizedResponse.access_token = '[REDACTED]'
			}
		}

		const responseData = {
			timestamp,
			level: 'INFO',
			message: `Response sent from ${endpoint}`,
			endpoint,
			statusCode,
			response: sanitizedResponse,
			duration: duration ? `${duration}ms` : null
		}

		console.log(JSON.stringify(responseData))
	},

	logAction: (action, data = {}) => {
		const timestamp = new Date().toISOString()
		const logEntry = {
			timestamp,
			level: 'INFO',
			message: `Action: ${action}`,
			action,
			...data
		}
		console.log(JSON.stringify(logEntry))
	},

	logAuth: (success, clientId = null, scope = null, error = null) => {
		const timestamp = new Date().toISOString()
		const logEntry = {
			timestamp,
			level: success ? 'INFO' : 'WARN',
			message: success ? 'Authentication successful' : 'Authentication failed',
			auth: {
				success,
				clientId: clientId || '[UNKNOWN]',
				scope: scope || '[NONE]'
			},
			error: error ? {
				name: error.name,
				message: error.message
			} : null
		}
		console.log(JSON.stringify(logEntry))
	}
}

export default logger
