import matter from 'gray-matter'
import { utils } from './utils'

const renameProperties = {
	name: 'title',
	category: 'tags',
	published: 'date',
}

const ignoreProperties = ['content', 'type']

const complexProperties = ['checkin', 'location']

const content = {
	output: (data, clientId) => {
		if (!data) {
			return null
		}

		let output = {}
		for (let [key, value] of Object.entries(data)) {
			if (!ignoreProperties.includes(key)) {
				const outputKey = renameProperties[key] || key
				if (complexProperties.includes(key)) {
					// Preserve complex object structure for checkin and location
					output[outputKey] = value
				} else {
					output[outputKey] = value
				}
			}
		}
		if (clientId) {
			output['client_id'] = clientId
		}

		return matter.stringify(data.content || '', output)
	},

	format: (data, clientId) => {
		if (!data) {
			return null
		}
		// Use published date if available, otherwise current date
		let date = new Date()
		if (data.published) {
			date = new Date(data.published)
		} else if (data.date) {
			date = new Date(data.date)
		}

		if (!data.date && !data.published) {
			data.date = date.toISOString()
		} else {
			data.updated = new Date().toISOString()
		}
		const type = content.getType(data) || ''
		let slugParts = []
		if (process.env.FILENAME_FULL_DATE) {
			// Jekyll post filenames must have YYYY-MM-DD in the filename
			slugParts.push(date.toISOString().substr(0, 10)) // or split('T')[0]
		}
		// Include timestamp in filename for everything except articles and checkins
		if (type != 'articles' && type != 'checkins' && !data.slug)
			slugParts.push(Math.round(date / 1000))
		if (data.slug) {
			slugParts.push(utils.slugify(data.slug))
		} else if (data.name) {
			slugParts.push(utils.slugify(data.name))
		} else if (
			data.checkin &&
      Array.isArray(data.checkin) &&
      data.checkin.length > 0
		) {
			// For checkins, use timestamp only (no extra ID from syndication URL)
			slugParts.push(Math.round(date / 1000))
		} else {
			const cite =
        data['watch-of'] ||
        data['read-of'] ||
        data['listen-of'] ||
        data['play-of']
			if (cite && cite.properties) {
				const { name, published } = cite.properties
				name && name.length > 0 && slugParts.push(utils.slugify(name[0]))
				published && published.length > 0 && slugParts.push(published[0])
			}
		}
		const slug = slugParts.join('-')
		const dir = (process.env.CONTENT_DIR || 'src').replace(/\/$/, '')
		const [year, month, day] = date.toISOString().split('T')[0].split('-')
		let datePrefix = ''
		if (type === 'notes' || type === 'checkins') {
			datePrefix = `${year}/${month}/${day}/`
		}
		const filename = `${dir}/${type}/${datePrefix}${slug}.md`

		// Build slug to match filename structure
		let slugPath = `${type}/`
		if (type === 'notes' || type === 'checkins') {
			slugPath += `${year}/${month}/${day}/`
		}
		slugPath += slug

		return {
			filename: filename,
			slug: slugPath,
			formatted: content.output(data, clientId),
			data: data,
		}
	},

	getType: (data) => {
		if (!utils.objectHasKeys(data)) return null
		if (data['like-of']) return 'likes'
		if (data['bookmark-of']) return 'bookmarks'
		if (data['checkin']) return 'checkins'
		if (data['rsvp'] && data['in-reply-to']) return 'rsvp'
		if (data['name']) return 'articles'
		if (data['watch-of']) return 'watched'
		if (data['read-of']) return 'read'
		if (data['listen-of']) return 'listen'
		if (data['play-of']) return 'play'
		return 'notes'
	},

	mediaFilename: (file) => {
		if (file && file.filename) {
			let dir = (process.env.MEDIA_DIR || 'uploads').replace(/\/$/, '')
			return `${dir}/${Math.round(new Date() / 1000)}_${file.filename}`
		}
	},
}

export default content
