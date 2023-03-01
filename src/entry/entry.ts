import { APIEmbed, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { join as joinPath } from "node:path"
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { initMark } from "./markdown.js"

export interface Entry {
	word: string
	class: string | string[]
	pronounciation: Pronounciation
	forms?: string
	etymology: string
	definitions: (Definition | TopDefinition)[]
}

interface Pronounciation {
	rp: string
	us: string
	note?: string
}

export interface TopDefinition {
	text?: string
	sub: Definition[]
	quotes?: Quote[]
}

export interface Definition {
	text: string
	quotes?: Quote[]
}

export interface Quote {
	date: string
	author: string
	location: string
	text: string
	note?: string
}

export async function makeEmbed ( interaction: ChatInputCommandInteraction ): Promise<APIEmbed | EmbedBuilder> {
	const word = interaction.options.get("word")
	if (!word) throw new Error("no option specified")

	const value = word.value as string

	// todo implement search
	if (/^\d+$/.test(value)) {
		const id = value
		const entry = await getEntry(id)

		return _makeEmbed(entry)
	} else {
		throw new Error("only ids currently supported")
	}
}

function _makePronounciation ( inp: Entry["pronounciation"] ) {
	const note = inp.note ? `, ${inp.note}` : ""
	return `RP \`${inp.rp}\`, US \`${inp.us}\`${note}`
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

async function _makeEmbed ( entry: Entry ): Promise<EmbedBuilder> {
	const allMeta = await fetchAllMeta()
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

export async function fetchAllMeta () {
	const path = "entries"
	const all = await readdir(path)
	const allMeta: smallMeta[] = await Promise.all(
		all.filter(( fileName ) => /\.json$/.test(fileName)).map(async ( fileName ) => {
			const filePath = joinPath(path, fileName)
			const content = await readFile(filePath)
			const entry: Entry = JSON.parse(content.toString())
			return {
				id: fileName.slice(0, -5),
				word: entry.word,
				class: entry.class
			}
		})
	)

	return allMeta
}
