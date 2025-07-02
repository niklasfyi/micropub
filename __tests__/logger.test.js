import logger from '../src/libs/logger'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('logger', () => {
	let mockConsoleLog
	let mockConsoleError
	let mockConsoleWarn

	beforeEach(() => {
		mockConsoleLog = jest.fn()
		mockConsoleError = jest.fn()
		mockConsoleWarn = jest.fn()
		console.log = mockConsoleLog
		console.error = mockConsoleError
		console.warn = mockConsoleWarn
	})

	afterEach(() => {
		console.log = originalConsoleLog
		console.error = originalConsoleError
		console.warn = originalConsoleWarn
		jest.clearAllMocks()
	})

	describe('info', () => {
		test('logs info message with data', () => {
			logger.info('Test message', { key: 'value' })

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Test message')
			expect(loggedData.key).toBe('value')
			expect(loggedData.timestamp).toBeTruthy()
		})

		test('logs info message without data', () => {
			logger.info('Test message')

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Test message')
			expect(loggedData.timestamp).toBeTruthy()
		})
	})

	describe('error', () => {
		test('logs error with Error object', () => {
			const error = new Error('Test error')
			logger.error('Error occurred', error, { context: 'test' })

			expect(mockConsoleError).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0])

			expect(loggedData.level).toBe('ERROR')
			expect(loggedData.message).toBe('Error occurred')
			expect(loggedData.error.name).toBe('Error')
			expect(loggedData.error.message).toBe('Test error')
			expect(loggedData.error.stack).toBeTruthy()
			expect(loggedData.context).toBe('test')
			expect(loggedData.timestamp).toBeTruthy()
		})

		test('logs error without Error object', () => {
			logger.error('Error occurred', null, { context: 'test' })

			expect(mockConsoleError).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleError.mock.calls[0][0])

			expect(loggedData.level).toBe('ERROR')
			expect(loggedData.message).toBe('Error occurred')
			expect(loggedData.error).toBeNull()
			expect(loggedData.context).toBe('test')
		})
	})

	describe('warn', () => {
		test('logs warning message', () => {
			logger.warn('Warning message', { key: 'value' })

			expect(mockConsoleWarn).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleWarn.mock.calls[0][0])

			expect(loggedData.level).toBe('WARN')
			expect(loggedData.message).toBe('Warning message')
			expect(loggedData.key).toBe('value')
			expect(loggedData.timestamp).toBeTruthy()
		})
	})

	describe('logRequest', () => {
		test('logs request with all data', () => {
			const event = {
				httpMethod: 'POST',
				headers: {
					'authorization': 'Bearer secret-token',
					'content-type': 'application/json',
					'user-agent': 'Test Client/1.0'
				},
				queryStringParameters: { q: 'config' },
				body: { action: 'create', access_token: 'secret' },
				pathParameters: { id: '123' }
			}

			logger.logRequest(event, 'micropub')

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Incoming POST request to micropub')
			expect(loggedData.endpoint).toBe('micropub')
			expect(loggedData.method).toBe('POST')
			expect(loggedData.headers.authorization).toBe('[REDACTED]')
			expect(loggedData.headers['content-type']).toBe('application/json')
			expect(loggedData.body.access_token).toBe('[REDACTED]')
			expect(loggedData.body.action).toBe('create')
			expect(loggedData.query).toEqual({ q: 'config' })
		})

		test('logs request with minimal data', () => {
			const event = {
				httpMethod: 'GET',
				headers: {},
				queryStringParameters: null,
				body: null,
				pathParameters: null
			}

			logger.logRequest(event)

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.endpoint).toBe('micropub')
			expect(loggedData.method).toBe('GET')
			expect(loggedData.body).toBeNull()
			expect(loggedData.query).toBeNull()
		})
	})

	describe('logResponse', () => {
		test('logs response with data', () => {
			const response = { status: 'created', id: '123' }
			logger.logResponse(201, response, 'micropub', 150)

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Response sent from micropub')
			expect(loggedData.endpoint).toBe('micropub')
			expect(loggedData.statusCode).toBe(201)
			expect(loggedData.response).toEqual(response)
			expect(loggedData.duration).toBe('150ms')
		})

		test('sanitizes access_token in response', () => {
			const response = { access_token: 'secret', data: 'value' }
			logger.logResponse(200, response)

			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])
			expect(loggedData.response.access_token).toBe('[REDACTED]')
			expect(loggedData.response.data).toBe('value')
		})
	})

	describe('logAction', () => {
		test('logs action with data', () => {
			logger.logAction('create_post', { client: 'test-client', type: 'note' })

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Action: create_post')
			expect(loggedData.action).toBe('create_post')
			expect(loggedData.client).toBe('test-client')
			expect(loggedData.type).toBe('note')
		})
	})

	describe('logAuth', () => {
		test('logs successful authentication', () => {
			logger.logAuth(true, 'test-client', 'create update', null)

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('INFO')
			expect(loggedData.message).toBe('Authentication successful')
			expect(loggedData.auth.success).toBe(true)
			expect(loggedData.auth.clientId).toBe('test-client')
			expect(loggedData.auth.scope).toBe('create update')
			expect(loggedData.error).toBeNull()
		})

		test('logs failed authentication', () => {
			const error = new Error('Invalid token')
			logger.logAuth(false, null, null, error)

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0])

			expect(loggedData.level).toBe('WARN')
			expect(loggedData.message).toBe('Authentication failed')
			expect(loggedData.auth.success).toBe(false)
			expect(loggedData.auth.clientId).toBe('[UNKNOWN]')
			expect(loggedData.auth.scope).toBe('[NONE]')
			expect(loggedData.error.name).toBe('Error')
			expect(loggedData.error.message).toBe('Invalid token')
		})
	})
})
