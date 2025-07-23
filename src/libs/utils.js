import got from 'got'

const Base64 = {
	encode: (content) => Buffer.from(content).toString('base64'),
	decode: (content) => Buffer.from(content, 'base64').toString('utf8'),
}

const utils = {
	// Gets only properties from array `allow` that are in `props`
	pick: (allow, props) => {
		let allowed = {}
		for (let prop in props) {
			if (allow.includes(prop)) {
				allowed[prop] = props[prop]
			}
		}
		return allowed
	},

	isObject: (obj) => Object.prototype.toString.call(obj) === '[object Object]',

	objectHasKeys: (obj) => utils.isObject(obj) && !!Object.keys(obj).length,

	slugify: (text) => {
		return text
			.toLowerCase()
			.replace(/[^\w- ]+/g, '')
			.replace(/[- ]+/g, ' ')
			.trim()
			.replace(/ /g, '-')
	},

	removeEmpty: (data) => {
		for (let i in data) {
			if (
				data[i] === undefined ||
        data[i] === null ||
        (Array.isArray(data[i]) && !data[i].length) ||
        (utils.isObject(data[i]) && !Object.keys(data[i]).length)
			) {
				delete data[i]
			}
		}
		return data
	},

	urlToFilename: (urlString) => {
		try {
			const url = new URL(urlString)
			if (
				url &&
        url.origin == process.env.ME.replace(/\/$/, '') &&
        url.pathname
			) {
				const dir = (process.env.CONTENT_DIR || 'src').replace(/\/$/, '')
				return `${dir}/${url.pathname.replace(/^\/|\/$/g, '')}.md`
			}
		} catch (err) {
			console.error(err)
			console.error('Invalid URL:', urlString)
		}
	},

	async fetchMapboxImage(lat, lon, options = {}) {
		const {
			zoom = 14,
			width = 748,
			height = 420,
			token = process.env.MAPBOX_TOKEN, // Store your token in env
		} = options

		if (!token) throw new Error('Mapbox token is required')

		const styles = ['dark-v11', 'light-v11']
		const urls = styles.map(
			(style) =>
				`https://api.mapbox.com/styles/v1/mapbox/${style}/static/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`,
		)

		const [darkImage, lightImage] = await Promise.all(
			urls.map((url) =>
				got(url, { responseType: 'buffer' }).then((res) => res.body),
			),
		)

		return { dark: darkImage, light: lightImage } // Both image buffers
	},
}

export { Base64, utils }
