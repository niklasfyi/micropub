
import content from '../src/libs/content'

describe('content', () => {
	const likedURL = 'https://domain.tld'

	let data

	beforeEach(() => {
		data = {
			'date': '2021-09-09T12:23:34.120Z',
			'name': 'Title',
			'category': [ 'one', 'two', 'three' ],
			'updated': '2021-10-09T12:23:34.120Z',
			'content': 'This is the content'
		}
	})

	describe('output', () => {
		test('standard post', () => {
			const fm = content.output(data)
			expect(fm).toBe('---\n' +
			'date: \'2021-09-09T12:23:34.120Z\'\n' +
			'title: Title\n' +
			'tags:\n' +
			'  - one\n' +
			'  - two\n' +
			'  - three\n' +
			'updated: \'2021-10-09T12:23:34.120Z\'\n' +
			'---\n' +
			'This is the content\n')
		})

		test('deleted post', () => {
			data.deleted = true
			const fm = content.output(data)
			expect(fm).toContain('\ndeleted: true\n')
		})

		test('draft article', () => {
			data.draft = true
			const fm = content.output(data)
			expect(fm).toContain('\ndraft: true\n')
		})

		test('checkin post', () => {
			const checkinData = {
				'published': '2025-06-30T09:21:17+02:00',
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
				}],
				'content': 'Checked in at MazeMap AS'
			}
			const fm = content.output(checkinData)
			expect(fm).toContain('date: \'2025-06-30T09:21:17+02:00\'')
			expect(fm).toContain('syndication:')
			expect(fm).toContain('checkin:')
			expect(fm).toContain('location:')
			expect(fm).toContain('MazeMap AS')
			expect(fm).toContain('Checked in at MazeMap AS')
		})

		test('no tags', () => {
			delete data.category
			const fm = content.output(data)
			expect(fm).not.toContain('\ntags:')
		})

		test('like post', () => {
			data['like-of'] = likedURL
			const fm = content.output(data)
			expect(fm).toContain('\nlike-of:')
		})

		test('bookmark post', () => {
			data['bookmark-of'] = likedURL
			const fm = content.output(data)
			expect(fm).toContain('\nbookmark-of:')
		})

		test('reply post', () => {
			data['in-reply-to'] = likedURL
			const fm = content.output(data)
			expect(fm).toContain('\nin-reply-to:')
		})

		test('rsvp post', () => {
			data['in-reply-to'] = likedURL
			data['rsvp'] = 'maybe'
			const fm = content.output(data)
			expect(fm).toContain('\nin-reply-to:')
			expect(fm).toContain('\nrsvp:')
		})

		test('null data', () => {
			const fm = content.output()
			expect(fm).toBeFalsy()
		})

		test('photo post', () => {
			data['photo'] = [ likedURL ]
			const fm = content.output(data)
			expect(fm).toContain(`\nphoto:\n  - '${likedURL}'`)
		})

		test('photo post with alt text', () => {
			data['photo'] = [{
				value: likedURL,
				alt: 'alt-text'
			}]
			const fm = content.output(data)
			expect(fm).toContain(`\nphoto:\n  - value: '${likedURL}'`)
			expect(fm).toContain('alt: alt-text')
		})
	})

	describe('format', () => {
		test('set create date', () => {
			delete data.date
			delete data.updated
			const formatted = content.format(data)
			expect(formatted.data).toHaveProperty('date')
		})

		test('treat "published" as "date" and add "updated"', () => {
			data.published = data.date
			delete data.date
			const formatted = content.format(data)
			expect(formatted.data).toHaveProperty('updated')
		})

		test('set updated date', () => {
			delete data.updated
			const formatted = content.format(data)
			expect(formatted.data).toHaveProperty('updated')
		})

		test('change updated date', () => {
			const updated = '2021-10-09T12:23:34.120Z'
			data.updated = updated
			const formatted = content.format(data)
			expect(formatted.data.updated).not.toBe(updated)
		})

		test('is article', () => {
			const formatted = content.format(data)
			expect(formatted).toHaveProperty('slug')
			expect(formatted.slug).toMatch(/^articles\/.*/)
			expect(formatted).toHaveProperty('filename')
			expect(formatted.filename).toMatch(/^src\/articles\/.*/)
			expect(formatted.filename).toBe(`src/${formatted.slug}.md`)
		})

		test('is note', () => {
			delete data.name
			const formatted = content.format(data)
			expect(formatted).toHaveProperty('slug')
			expect(formatted.slug).toMatch(/^notes\/.*/)
			expect(formatted).toHaveProperty('filename')
			expect(formatted.filename).toMatch(/^src\/notes\/.*/)
			expect(formatted.filename).toBe(`src/${formatted.slug}.md`)
		})

		test('is checkin', () => {
			const checkinData = {
				'checkin': [{
					'type': ['h-card'],
					'properties': {
						'name': ['MazeMap AS'],
						'url': ['https://foursquare.com/v/641c535d7e3e0f67a6a86e0f']
					}
				}],
				'syndication': 'https://www.swarmapp.com/user/1399634990/checkin/68623aeded37c54e6215ca7c'
			}
			const formatted = content.format(checkinData)
			expect(formatted).toHaveProperty('slug')
			expect(formatted.slug).toMatch(/^checkins\/\d{4}\/\d{2}\/\d{2}\/.*/)
			expect(formatted.slug).toContain('a7c') // last 5 chars of syndication URL
			expect(formatted).toHaveProperty('filename')
			expect(formatted.filename).toMatch(/^src\/checkins\/\d{4}\/\d{2}\/\d{2}\/.*/)
			expect(formatted.filename).toBe(`src/${formatted.slug}.md`)
		})
	})

	describe('mediaFilename', () => {
		const file = {
			filename: 'image.png'
		}
		test('valid image', () => {
			const filename = content.mediaFilename(file)
			expect(filename).toMatch(/^uploads\//)
			expect(filename).toMatch(`_${file.filename}`)
		})

		test('invalid image', () => {
			const filename = content.mediaFilename({})
			expect(filename).toBeFalsy()
		})
	})

	describe('getType', () => {
		test('is like', () => {
			expect(content.getType({ 'like-of': likedURL })).toBe('likes')
		})

		test('is bookmark', () => {
			expect(content.getType({ 'bookmark-of': likedURL })).toBe('bookmarks')
		})

		test('is rsvp', () => {
			const data = { 'rsvp': 'yes' }
			expect(content.getType(data)).not.toBe('rsvp')
			data['in-reply-to'] = likedURL
			expect(content.getType(data)).toBe('rsvp')
		})

		test('is article', () => {
			expect(content.getType({ 'name': 'hello' })).toBe('articles')
		})

		test('is watched', () => {
			expect(content.getType({ 'watch-of': likedURL })).toBe('watched')
		})

		test('is read', () => {
			expect(content.getType({ 'read-of': likedURL })).toBe('read')
		})

		test('is listen', () => {
			expect(content.getType({ 'listen-of': likedURL })).toBe('listen')
		})

		test('is play', () => {
			expect(content.getType({ 'play-of': likedURL })).toBe('play')
		})

		test('is checkin', () => {
			const checkinData = {
				'checkin': [{
					'type': ['h-card'],
					'properties': {
						'name': ['MazeMap AS'],
						'url': ['https://foursquare.com/v/641c535d7e3e0f67a6a86e0f']
					}
				}],
				'syndication': 'https://www.swarmapp.com/user/1399634990/checkin/68623aeded37c54e6215ca7c'
			}
			expect(content.getType(checkinData)).toBe('checkins')
		})

		test('is note', () => {
			expect(content.getType()).not.toBe('notes')
			expect(content.getType({})).not.toBe('notes')
		})
	})

	describe('client_id', () => {
		test('standard post', () => {
			const clientId = 'http://example.com'
			const fm = content.output(data, clientId)
			expect(fm).toContain(`\nclient_id: '${clientId}'`)
		})
	})
})
