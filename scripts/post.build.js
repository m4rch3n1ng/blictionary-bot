import { copyFile, cp, mkdir, writeFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { __dirname } from "./_utils.js"
import pkg from "../package.json" assert { type: "json" }
import { existsSync } from "node:fs"

async function main () {
	if (!existsSync(joinPath(__dirname, "build"))) await mkdir(joinPath(__dirname, "build"))
	await cp(joinPath(__dirname, "dist"), joinPath(__dirname, "build", "dist"), { recursive: true })

	await copyFile(joinPath(__dirname, ".env"), joinPath(__dirname, "build", ".env"))
	await copyFile(joinPath(__dirname, "LICENSE"), joinPath(__dirname, "build", "LICENSE"))
	await writeFile(
		joinPath(__dirname, "build", "ecosystem.config.cjs"),
		"module.exports = { apps : [ { name: \"discord-mayibot\", script: \"npm install && npm start\" }]}\n"
	)

	await writeFile(joinPath(__dirname, "build", "package.json"), JSON.stringify({
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
