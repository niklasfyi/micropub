import got from 'got'

import { Base64 } from './utils'

const GitHub = {
	// https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
	createFile: async (filename, content) => {
		console.log('GITHUB.createFile', content)
		return await GitHub.upload('PUT', filename, {
			content: Base64.encode(content),
			message: `add: ${filename}`,
		})
	},

	// https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
	updateFile: async (filename, content, original) => {
		console.log('GITHUB.updateFile', content)
		return await GitHub.upload('PUT', filename, {
			content: Base64.encode(content),
			sha: original.sha,
			message: `update: ${filename}`,
		})
	},

	// https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
	uploadImage: async (filename, file) => {
		console.log('GITHUB.uploadImage', filename, file.filename)
		return await GitHub.upload('PUT', filename, {
			content: Base64.encode(file.content),
			message: `upload: ${filename}`,
		})
	},

	upload: async (method, filename, jsonBody) => {
		const body = await GitHub.request(
			method,
			encodeURIComponent(filename),
			jsonBody
		)
		if (body && body.content && body.content.path) {
			return filename
		}
	},

	// https://docs.github.com/en/rest/reference/repos#get-repository-content
	getFile: async (filename) => {
		const body = await GitHub.request(
			'GET',
			encodeURIComponent(filename) +
        (process.env.GIT_BRANCH ? `?ref=${process.env.GIT_BRANCH}` : '')
		)
		if (body) {
			return {
				filename: filename,
				content: Base64.decode(body.content),
				sha: body.sha,
			}
		}
	},

	// Same as `getFile`
	// Keeping as a separate function in case this needs to change since
	// GitHub Contents returns first 1000 files sorted by filename in dir
	// Might switch to tree API later
	// https://docs.github.com/en/rest/reference/git#get-a-tree
	getDirectory: async (dir) => {
		const body = await GitHub.request(
			'GET',
			encodeURIComponent(dir) +
        (process.env.GIT_BRANCH ? `?ref=${process.env.GIT_BRANCH}` : '')
		)
		if (body && Array.isArray(body)) {
			return { files: body }
		}
	},

	// https://docs.github.com/en/rest/reference/repos#delete-a-file
	deleteFile: async (filename, original) => {
		const body = await GitHub.request('DELETE', encodeURIComponent(filename), {
			sha: original.sha,
			message: `delete: ${filename}`,
		})
		if (body) {
			return filename
		}
	},

	// Create multiple files in a single commit using Git Tree API
	createMultipleFiles: async (files, commitMessage) => {
		console.log(
			'GITHUB.createMultipleFiles',
			files.map((f) => f.path)
		)

		if (process.env.DEBUG) {
			console.log('-- DEBUGGING')
			return files.map((f) => f.path)
		}

		try {
			// Get the current branch reference
			const branch = process.env.GIT_BRANCH || 'main'
			const refResponse = await GitHub.gitRequest(
				'GET',
				`git/ref/heads/${branch}`
			)
			if (!refResponse) {
				throw new Error(`Failed to get reference for branch ${branch}`)
			}

			// Get the current commit
			const currentCommitSha = refResponse.object.sha
			const commitResponse = await GitHub.gitRequest(
				'GET',
				`git/commits/${currentCommitSha}`
			)
			if (!commitResponse) {
				throw new Error('Failed to get current commit')
			}

			// Create blobs for each file
			const blobPromises = files.map(async (file) => {
				const blobResponse = await GitHub.gitRequest('POST', 'git/blobs', {
					content: Base64.encode(file.content),
					encoding: 'base64',
				})
				if (!blobResponse) {
					throw new Error(`Failed to create blob for ${file.path}`)
				}
				return {
					path: file.path,
					mode: '100644',
					type: 'blob',
					sha: blobResponse.sha,
				}
			})

			const treeEntries = await Promise.all(blobPromises)

			// Create new tree
			const treeResponse = await GitHub.gitRequest('POST', 'git/trees', {
				base_tree: commitResponse.tree.sha,
				tree: treeEntries,
			})
			if (!treeResponse) {
				throw new Error('Failed to create tree')
			}

			// Create new commit
			const newCommitResponse = await GitHub.gitRequest('POST', 'git/commits', {
				message: commitMessage,
				tree: treeResponse.sha,
				parents: [currentCommitSha],
				...(process.env.AUTHOR_EMAIL && process.env.AUTHOR_NAME
					? {
						committer: {
							email: process.env.AUTHOR_EMAIL,
							name: process.env.AUTHOR_NAME,
						},
					}
					: {}),
			})
			if (!newCommitResponse) {
				throw new Error('Failed to create commit')
			}

			// Update the branch reference
			const updateRefResponse = await GitHub.gitRequest(
				'PATCH',
				`git/refs/heads/${branch}`,
				{
					sha: newCommitResponse.sha,
				}
			)
			if (!updateRefResponse) {
				throw new Error('Failed to update branch reference')
			}

			return files.map((f) => f.path)
		} catch (err) {
			console.error('Failed to create multiple files:', err)
			return null
		}
	},

	// Git API request helper (different from Contents API)
	gitRequest: async (method, endpoint, json) => {
		console.log(`GITHUB.git.${method}`, endpoint)

		const instance = got.extend({
			prefixUrl: `https://api.github.com/repos/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/`,
			headers: {
				accept: 'application/vnd.github.v3+json',
				authorization: `Bearer ${process.env.GIT_TOKEN}`,
			},
			responseType: 'json',
		})

		const options = {
			method: method.toUpperCase(),
		}
		if (json) {
			options['Content-Type'] = 'application/json'
			options['json'] = json
		}

		try {
			const { body } = await instance(endpoint, options)
			console.log('└─>', body)
			return body
		} catch (err) {
			const { response } = err
			console.error('GIT API ERROR', response.statusCode, response.body)
			return null
		}
	},

	request: async (method, endpoint, json) => {
		console.log(`GITHUB.${method}`, endpoint)
		if (process.env.DEBUG && method != 'GET') {
			console.log('-- DEBUGGING')
			return {
				debugging: true,
				content: {
					path: true,
				},
			}
		}
		const instance = got.extend({
			prefixUrl: `https://api.github.com/repos/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}/contents/`,
			headers: {
				accept: 'application/vnd.github.v3+json',
				authorization: `Bearer ${process.env.GIT_TOKEN}`,
			},
			responseType: 'json',
		})

		const options = {
			method: method.toUpperCase(),
		}
		if (json) {
			options['Content-Type'] = 'application/json'
			if (process.env.GIT_BRANCH) {
				json['branch'] = process.env.GIT_BRANCH
			}
			if (process.env.AUTHOR_EMAIL && process.env.AUTHOR_NAME) {
				json['committer'] = {
					email: process.env.AUTHOR_EMAIL,
					name: process.env.AUTHOR_NAME,
				}
			}
			options['json'] = json
		}
		try {
			const { body } = await instance(endpoint, options)
			console.log('└─>', body)
			return method == 'GET'
				? body
				: {
					success: true,
					...body,
				}
		} catch (err) {
			const { response } = err
			console.error('ERROR', response.statusCode, response.body)
		}
	},
}

export default GitHub
