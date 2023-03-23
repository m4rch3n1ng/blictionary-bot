import { APIEmbed, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { join as joinPath } from "node:path"
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { initMark, wordClassToString } from "./markdown.js"
import { fuzzy } from "./fuzzy.js"

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

interface SubEntry {
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

export async function makeEmbed ( interaction: ChatInputCommandInteraction ): Promise<APIEmbed | EmbedBuilder> {
	const word = interaction.options.get("word")
	if (!word) throw new Error("no option specified")

	const query = word.value as string
	const allEntries = await fetchAllEntries()

	// todo implement search
	if (/^\d+$/.test(query)) {
		const id = query
		const entry = await getEntry(id)

		return _makeEmbed(allEntries, entry)
	} else {
		const extraEntries = extSmallEntries(allEntries)

		const allFind = extraEntries.filter(({ word }) => word === query)
		if (allFind.length === 1 && allFind[0]) {
			const find = allFind[0]
			if (find.sub) {
				return _makeSubEmbed(allEntries, find)
			} else {
				const entry = await getEntry(find.id)
				return _makeEmbed(allEntries, entry)
			}
		}

		const filteredEntries = fuzzy<(subSubEntry | subSmallEntry)>(query, extraEntries)
		const bestResult = filteredEntries[0]

		if (!bestResult) throw new Error("no match")

		if (bestResult.sub) {
			return _makeSubEmbed(allEntries, bestResult)
		} else {
			const entry = await getEntry(bestResult.id)
			return _makeEmbed(allEntries, entry)
		}
	}
}

export interface subSubEntry extends SubEntry {
	sub: true
}

export interface subSmallEntry extends smallEntry {
	sub: false
}

// todo comments lmao
function extSmallEntries ( allEntries: smallSubEntry[] ): (subSmallEntry | subSubEntry)[] {
	const allSmall: (smallEntry & { sub: false })[] = allEntries.map(( entry ) => ({ ...entry, sub: false }))
	const allSub: (SubEntry & { sub: true })[] = (allEntries.map(({ sub }) => sub).filter(( sub ) => sub).flat() as SubEntry[]).map(( sub ) => ({ ...sub, sub: true }))

	return [ ...allSmall, ...allSub ]
}

function _makePronounciation ( inp: Entry["pronounciation"] ) {
	const note = inp.note ? `, ${inp.note}` : ""
	return `R.P. \`${inp.rp}\`, U.S. \`${inp.us}\`${note}`
}

function _makeDefinitions ( inp: Entry["definitions"] ) {
	const defs = []

	for (let i = 0; i < inp.length; i++) {
		const _in = inp[i]!
		const txt = _in.text ? ` ${_in.text}` : ""
		defs.push(`${i + 1}.${txt}`)

		if ("sub" in _in) {
			const alph = "abcdefghijklmnopqrstuvw"
			const sub = _in.sub
			for (let j = 0; j < sub.length; j++) {
				const __in = sub[j]!
				defs.push(`${alph[j]}.${__in.text}`)
			}
		}
	}

	return defs.join("\n")
}

async function _makeSubEmbed ( allEntries: smallEntry[], entry: SubEntry ) {
	const marked = initMark(allEntries)

	return new EmbedBuilder()
		.setColor(0x008080)
		.setAuthor({
			name: "blictionary",
			iconURL: "https://cdn.discordapp.com/icons/876853152702398505/6451755d09135e4ce8f96060cc0d4c49.webp",
			url: process.env.BLICTIONARY_URL
		})
		.setTitle(`${entry.word}, ${wordClassToString(entry.class)}`)
		.addFields({ name: "__Definition:__", value: marked(entry.definition) })
		.setTimestamp()
}

async function _makeEmbed ( allEntries: smallEntry[], entry: Entry ): Promise<EmbedBuilder> {
	const marked = initMark(allEntries)

	const pronounciationTxt = _makePronounciation(entry.pronounciation)
	const definitionTxt = _makeDefinitions(entry.definitions)

	return new EmbedBuilder()
		.setColor(0x008080)
		.setAuthor({
			name: "blictionary",
			iconURL: "https://cdn.discordapp.com/icons/876853152702398505/6451755d09135e4ce8f96060cc0d4c49.webp",
			url: process.env.BLICTIONARY_URL
		})
		.setTitle(`${entry.word}, ${wordClassToString(entry.class)}`)
		.addFields({ name: "__Pronounciation:__", value: marked(pronounciationTxt) })
		.addFields({ name: "__Definitions:__", value: marked(definitionTxt) })
		.setTimestamp()
}

async function getEntry ( id: string ): Promise<Entry> {
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
