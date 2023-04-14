import { readdir, rm } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const __rootname = dirname(__dirname)

export async function emptyDir ( directory ) {
	const files = await readdir(directory)
	return Promise.all(files.map(( file ) => rm(joinPath(directory, file), { recursive: true })))
}
