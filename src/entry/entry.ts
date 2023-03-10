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
	const allMeta = await fetchAllMeta()

	// todo implement search
	if (/^\d+$/.test(query)) {
		const id = query
		const entry = await getEntry(id)

		return _makeEmbed(allMeta, entry)
	} else {
		const extraMeta = _extSmallMeta(allMeta)

		const allFind = extraMeta.filter(({ word }) => word === query)
		if (allFind.length === 1 && allFind[0]) {
			const find = allFind[0]
			if (find.sub) {
				return _makeSubEmbed(allMeta, find)
			} else {
				const entry = await getEntry(find.id)
				return _makeEmbed(allMeta, entry)
			}
		}

		const filteredMeta = fuzzy(extraMeta, query)
		const bestResult = filteredMeta[0]

		if (!bestResult) throw new Error("no match")

		if (bestResult.sub) {
			return _makeSubEmbed(allMeta, bestResult)
		} else {
			const entry = await getEntry(bestResult.id)
			return _makeEmbed(allMeta, entry)
		}
	}
}

export interface subSubEntry extends SubEntry {
	sub: true
}

export interface subSmallMeta extends smallMeta {
	sub: false
}

// todo comments lmao
function _extSmallMeta ( meta: subMeta[] ): (subSmallMeta | subSubEntry)[] {
	const allSmall: (smallMeta & { sub: false })[] = meta.map(( meta ) => ({ ...meta, sub: false }))
	const allSub: (SubEntry & { sub: true })[] = (meta.map(({ sub }) => sub).filter(( sub ) => sub).flat() as SubEntry[]).map(( sub ) => ({ ...sub, sub: true }))

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

async function _makeSubEmbed ( allMeta: smallMeta[], entry: SubEntry ) {
	const marked = initMark(allMeta)

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

async function _makeEmbed ( allMeta: smallMeta[], entry: Entry ): Promise<EmbedBuilder> {
	const marked = initMark(allMeta)

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

export interface smallMeta {
	id: string
	word: string
	class: string | string[],
}

interface subMeta extends smallMeta {
	sub?: SubEntry[]
}

export async function fetchAllMeta (): Promise<subMeta[]> {
	const path = "entries"
	const all = await readdir(path)
	const allMeta: (subMeta)[] = await Promise.all(
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

	return allMeta
}
