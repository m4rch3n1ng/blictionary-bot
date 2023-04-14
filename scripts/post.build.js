import { copyFile, cp, mkdir, writeFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { __rootname } from "./_utils.js"
import pkg from "../package.json" assert { type: "json" }
import { existsSync } from "node:fs"

async function main () {
	if (!existsSync(joinPath(__rootname, "build"))) await mkdir(joinPath(__rootname, "build"))
	await cp(joinPath(__rootname, "dist"), joinPath(__rootname, "build", "dist"), { recursive: true })

	await copyFile(joinPath(__rootname, ".env"), joinPath(__rootname, "build", ".env"))
	await copyFile(joinPath(__rootname, "LICENSE"), joinPath(__rootname, "build", "LICENSE"))

	await copyFile(joinPath(__rootname, "scripts", "start.sh"), joinPath(__rootname, "build", "start.sh"))
	await copyFile(joinPath(__rootname, "scripts", "stop.sh"), joinPath(__rootname, "build", "stop.sh"))

	await writeFile(joinPath(__rootname, "build", "package.json"), JSON.stringify({
		name: pkg.name,
		version: pkg.version,
		description: pkg.description,
		author: pkg.author,
		license: pkg.license,
		main: "./dist/index.js",
		scripts: {
			start: "node dist/index.js",
			register: "node dist/register.js"
		},
		dependencies: pkg.dependencies,
		type: "module",
		private: true
	}, null, "\t") + "\n")
}

main()
