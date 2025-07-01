
import parse from '../src/libs/parse'

describe('parse', () => {
	const likedURL = 'https://domain.tld'
	const json = {
		'type': [ 'h-entry' ],
		'properties': {
			'name': [ 'Title' ],
			'content': [ 'Content goes here\r\nAnd thats all' ],
			'category': [ 'one', 'two', 'three' ],
			'post-status': [ 'published' ],
			'visibility': [ 'public' ],
			'mp-slug': [ 'this-is-a-slug' ],
			'like-of': [ likedURL ],
			'bookmark-of': [ likedURL ],
			'in-reply-to': [ likedURL ],
			'rsvp': [ 'maybe' ],
			'deleted': [ true ],
			'photo': [ likedURL ]
		}
	}

	const form = {
		'h': 'entry',
		'content': 'Content goes here\r\nAnd thats all',
		'name': 'Title',
		'category': [ 'one', 'two', 'three' ],
		'mp-slug': 'this-is-a-slug',
		'like-of': likedURL,
		'bookmark-of': likedURL,
		'in-reply-to': likedURL,
		'photo': likedURL,
		'rsvp': 'maybe',
		'deleted': true
	}

	const fm = '---\n' +
	'date: 2021-09-09T12:23:34.120Z\n' +
	'title: "Title"\n' +
	'tags:\n' +
	' - one\n' +
	' - two\n' +
	' - three\n' +
	'updated: 2021-10-09T12:23:34.120Z\n' +
	`like-of: ${likedURL}\n` +
	`bookmark-of: ${likedURL}\n` +
	`in-reply-to: ${likedURL}\n` +
	'rsvp: maybe\n' +
	'deleted: true\n' +
	'---\n' +
	'\n' +
	'Content goes here\r\nAnd thats all'

	describe('getPropertyValue', () => {
		test('get content from array', () => {
			expect(parse.getPropertyValue(['test'])).toBe('test')
		})

		test('get content from string', () => {
			expect(parse.getPropertyValue('test')).toBe('test')
		})

		test('get content from empty array', () => {
			expect(parse.getPropertyValue([])).toBeUndefined()
		})

		test('get content from nothing', () => {
			expect(parse.getPropertyValue()).toBeUndefined()
		})

		test('get content from array of size 2', () => {
			expect(parse.getPropertyValue(['one', 'two'])).toBe('one')
		})
	})

	describe('itemsToArray', () => {
		test('string to array', () => {
			expect(parse.itemsToArray('sample')).toHaveLength(1)
		})

		test('array to array', () => {
			expect(parse.itemsToArray(['one', 'two'])).toHaveLength(2)
		})

		test('null to array', () => {
			expect(parse.itemsToArray()).toHaveLength(0)
		})
	})

	describe('fromJSON', () => {
		test('data with categories', () => {
			const data = parse.fromJSON(json)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.name).toBe('Title')
			expect(data.category).toHaveLength(3)
			expect(data['like-of']).toBe(likedURL)
			expect(data['bookmark-of']).toBe(likedURL)
			expect(data['in-reply-to']).toBe(likedURL)
			expect(data['rsvp']).toBe('maybe')
			expect(data['deleted']).toBe(true)
		})

		test('data without categories', () => {
			const tmp = {
				'type': json.type,
				'properties': {
					...json.properties
				}
			}
			delete tmp.properties.category
			const data = parse.fromJSON(tmp)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.name).toBe('Title')
			expect(data.category).toBeUndefined()
		})

		test('photo without alt json', () => {
			const data = parse.fromJSON(json)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.photo).toHaveLength(1)
			expect(data.photo[0]).toBe(likedURL)
		})

		test('photo with alt json', () => {
			json.properties.photo = [{ value: likedURL, alt: 'alt-text' }]
			const data = parse.fromJSON(json)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.photo).toHaveLength(1)
			expect(data.photo[0].value).toBe(likedURL)
			expect(data.photo[0].alt).toBeTruthy()
		})

		test('checkin with location', () => {
			const checkinJson = {
				'type': ['h-entry'],
				'properties': {
					'published': ['2025-06-30T09:21:17+02:00'],
					'syndication': ['https://www.swarmapp.com/user/1399634990/checkin/68623aeded37c54e6215ca7c'],
					'checkin': [{
						'type': ['h-card'],
						'properties': {
							'name': ['MazeMap AS'],
							'url': ['https://foursquare.com/v/641c535d7e3e0f67a6a86e0f', 'https://www.mazemap.com'],
							'latitude': [63.432685],
							'longitude': [10.407206],
							'street-address': ['Ferjemannsveien 10'],
							'locality': ['Trondheim'],
							'region': ['Sør-Trøndelag'],
							'country-name': ['Norway'],
							'postal-code': ['7042']
						},
						'value': 'https://foursquare.com/v/641c535d7e3e0f67a6a86e0f'
					}],
					'location': [{
						'type': ['h-adr'],
						'properties': {
							'latitude': [63.432685],
							'longitude': [10.407206],
							'street-address': ['Ferjemannsveien 10'],
							'locality': ['Trondheim'],
							'region': ['Sør-Trøndelag'],
							'country-name': ['Norway'],
							'postal-code': ['7042']
						}
					}]
				}
			}
			const data = parse.fromJSON(checkinJson)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.published).toBe('2025-06-30T09:21:17+02:00')
			expect(data.syndication).toBe('https://www.swarmapp.com/user/1399634990/checkin/68623aeded37c54e6215ca7c')
			expect(data.checkin).toHaveLength(1)
			expect(data.checkin[0].properties.name[0]).toBe('MazeMap AS')
			expect(data.location).toHaveLength(1)
			expect(data.location[0].properties.latitude[0]).toBe(63.432685)
		})
	})

	describe('fromForm', () => {
		test('multiple categories', () => {
			const data = parse.fromForm(form)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.name).toBe('Title')
			expect(data.category).toHaveLength(3)
			expect(data.name).toBe('Title')
			expect(data['like-of']).toBe(likedURL)
			expect(data['bookmark-of']).toBe(likedURL)
			expect(data['in-reply-to']).toBe(likedURL)
			expect(data['rsvp']).toBe('maybe')
			expect(data['deleted']).toBe(true)
		})

		const form2 = { ...form }
		test('single array of categories', () => {
			form2.category = [ 'one' ]
			const data = parse.fromForm(form2)
			expect(data.category).toHaveLength(1)
		})

		test('single string of category', () => {
			form2.category = 'one'
			const data = parse.fromForm(form2)
			expect(data.category).toHaveLength(1)
		})

		test('combine photos', () => {
			form2['photo'] = 'image1'
			form2['photo[]'] = ['image2', 'image3']
			form2['file'] = 'image4'
			form2['file[]'] = ['image5']
			const data = parse.fromForm(form2)
			expect(data.photo).toHaveLength(5)
		})

		test('photo without alt FORM', () => {
			const data = parse.fromForm(form)
			expect(data).toBeTruthy()
			expect(data.type).toBe('h-entry')
			expect(data.photo).toHaveLength(1)
			expect(data.photo[0]).toBe(likedURL)
		})
	})

	describe('fromFrontMatter', () => {
		test('parse frontmatter', () => {
			const parsed = parse.fromFrontMatter(fm)
			expect(parsed).toBeTruthy()
			expect(parsed.type).toBe('h-entry')
			expect(parsed.name).toBe('Title')
			expect(parsed.category).toHaveLength(3)
			expect(parsed.name).toBe('Title')
			expect(parsed.content).toBe(form.content)
			expect(parsed['like-of']).toBe(likedURL)
			expect(parsed['bookmark-of']).toBe(likedURL)
			expect(parsed['in-reply-to']).toBe(likedURL)
			expect(parsed['rsvp']).toBe('maybe')
			expect(parsed['deleted']).toBeTruthy()
		})
	})

	describe('toSource', () => {
		test('JSON to Source', () => {
			const source = parse.toSource(parse.fromJSON(json))
			expect(source).toBeTruthy()
			expect(source.type).toBe('h-entry')
			expect(source).toHaveProperty('properties')
			expect(source.properties.category).toHaveLength(3)
			expect(source.properties.name).toHaveLength(1)
			expect(source.properties.name[0]).toBe('Title')
		})

		test('Form to Source', () => {
			const source = parse.toSource(parse.fromForm(form))
			expect(source).toBeTruthy()
			expect(source.type).toBe('h-entry')
			expect(source).toHaveProperty('properties')
			expect(source.properties.category).toHaveLength(3)
			expect(source.properties.name).toHaveLength(1)
			expect(source.properties.name[0]).toBe('Title')
		})
	})
})
