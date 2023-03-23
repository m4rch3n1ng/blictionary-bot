// keep in relative sync with https://github.com/m4rch3n1ng/blictionary/blob/fuzzy/src/lib/entry.ts

import { join as joinPath } from "node:path"
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"

export interface Entry {
	word: string
	class: string | string[]
	pronounciation: Pronounciation
	forms?: string | string[]
	etymology: string | string[]
	definitions: (Definition | TopDefinition)[]
	sub?: SubEntry[]
}

interface Pronounciation {
	rp: string
	us: string
	note?: string
}

interface TopDefinition {
	text?: string
	sub: Definition[]
	quotes?: Quote[]
}

interface Definition {
	text: string
	quotes?: Quote[]
}

export interface SubEntry {
	word: string
	class: string | string[]
	definition: string
	quotes?: Quote[]
}

interface Quote {
	date: string
	author: string
	location: string
	text: string
	note?: string
}

export type fullSmallEntry = subSubEntry | subSmallEntry

export interface subSubEntry extends SubEntry {
	sub: true
}

export interface subSmallEntry extends smallEntry {
	sub: false
}

// todo comments lmao
export function extendSmallEntries ( allEntries: smallSubEntry[] ): (subSmallEntry | subSubEntry)[] {
	const allSmall: (smallEntry & { sub: false })[] = allEntries.map(( entry ) => ({ ...entry, sub: false }))
	const allSub: (SubEntry & { sub: true })[] = (allEntries.map(({ sub }) => sub).filter(( sub ) => sub).flat() as SubEntry[])
		.map(( sub ) => ({ ...sub, sub: true }))

	return [ ...allSmall, ...allSub ]
}

export async function getEntry ( id: string ): Promise<Entry> {
	const entryPath = joinPath("entries", `${id}.json`)
	if (!existsSync(entryPath)) throw new Error("entry does not exist")

	const entryFile = await readFile(entryPath)
	const entry: Entry = JSON.parse(entryFile.toString()) as Entry
	return entry
}

export interface smallEntry {
	id: string
	word: string
	class: string | string[],
}

interface smallSubEntry extends smallEntry {
	sub?: SubEntry[]
}

// add cache ref https://github.com/m4rch3n1ng/blictionary/pull/8
export async function fetchAllEntries (): Promise<smallSubEntry[]> {
	const path = "entries"
	const all = await readdir(path)
	const allEntries: (smallSubEntry)[] = await Promise.all(
		all.filter(( fileName ) => /\.json$/.test(fileName)).map(async ( fileName ) => {
			const filePath = joinPath(path, fileName)
			const content = await readFile(filePath)
			const entry: Entry = JSON.parse(content.toString())
			return {
				id: fileName.slice(0, -5),
				word: entry.word,
				class: entry.class,
				sub: entry.sub
			}
		})
	)

	return allEntries
}
