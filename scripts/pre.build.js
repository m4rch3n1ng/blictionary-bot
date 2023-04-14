import { rm } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { existsSync } from "node:fs"
import { emptyDir, __rootname } from "./_utils.js"

async function main () {
	const distPath = joinPath(__rootname, "dist")
	const buildPath = joinPath(__rootname, "build")
	if (existsSync(distPath)) await rm(distPath, { recursive: true })
	if (existsSync(buildPath)) await emptyDir(buildPath)
}

main()
