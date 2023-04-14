// keep in partial sync with https://github.com/m4rch3n1ng/blictionary/blob/fuzzy/src/lib/entry.ts

import CheapWatch from "cheap-watch"
import { join as joinPath } from "node:path"
import { existsSync, type Stats } from "node:fs"
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
	sub?: SubEntry[]
}

function entryCache () {
	const path = "entries"
	const allEntryMap = new Map<string, smallEntry>
	let allEntries: smallEntry[] | null = null

	const watcher = new CheapWatch({ dir: path, filter: watchFilter })
	watcher.init()
	watcher.on("+", plus)
	watcher.on("-", minus)

	function watchFilter ({ path, stats }: { path: string, stats: Stats }) {
		return isJSON(path) && stats.isFile()
	}

	async function plus ({ path: fileName }: { path: string }) {
		const id = fileName.slice(0, -5)
		const filePath = joinPath(path, fileName)
		await hitOnce(filePath, id)
		mapToArray()
	}

	function minus ({ path: fileName }: { path: string }) {
		const id = fileName.slice(0, -5)
		allEntryMap.delete(id)
	}


	// todo check for id
	// todo function get id
	function isJSON ( name: string ) {
		return /\.json$/.test(name)
	}

	// todo catch json errors
	async function readSmallEntry ( filePath: string, id: string ): Promise<smallEntry> {
		try {
			const content = await readFile(filePath)
			const entry: Entry = JSON.parse(content.toString())
			return {
				id,
				word: entry.word,
				class: entry.class,
				sub: entry.sub
			}
		} catch ( e: any ) {
			if (e.code === "EMFILE") {
				return readSmallEntry(filePath, id)
			} else {
				throw e
			}
		}
	}

	function mapToArray (): smallEntry[] {
		allEntries = [ ...allEntryMap.values() ].sort(( a, b ) => +a.id - +b.id)
		return allEntries
	}

	async function hitOnce ( filePath: string, id: string ) {
		const smallEntry = await readSmallEntry(filePath, id)
		allEntryMap.set(smallEntry.id, smallEntry)
	}

	async function hit (): Promise<smallEntry[]> {
		const all = await readdir(path)
		await Promise.all(
			all.filter(isJSON).map(( fileName ) => {
				const filePath = joinPath(path, fileName)
				const id = fileName.slice(0, -5)
				return hitOnce(filePath, id)
			})
		)

		return mapToArray()
	}

	return {
		async get (): Promise<smallEntry[]> {
			if (allEntries) {
				return allEntries
			} else {
				return hit()
			}
		}
	}
}

export const cache = entryCache()


export type allSmallEntry = flatSubEntry | flatSmallEntry

interface flatSubEntry extends SubEntry {
	isSub: true
}

interface flatSmallEntry extends smallEntry {
	isSub: false
}

export function flatSubEntries ( allEntries: smallEntry[] ): allSmallEntry[] {
	const allSmall: flatSmallEntry[] = allEntries.map(( entry ) => ({ ...entry, isSub: false }))
	const allSub: flatSubEntry[] = (allEntries.map(({ sub }) => sub).filter(( sub ) => sub).flat() as SubEntry[])
		.map(( sub ) => ({ ...sub, isSub: true }))

	return [ ...allSmall, ...allSub ]
}
