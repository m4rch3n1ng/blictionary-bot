import { EmbedBuilder } from "@discordjs/builders"
import type { Entry, smallEntry, SubEntry } from "./entry.js"

export async function makeSubEmbed ( allEntries: smallEntry[], entry: SubEntry ) {
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

export async function makeEmbed ( allEntries: smallEntry[], entry: Entry ): Promise<EmbedBuilder> {
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

function initMark ( allEntries: smallEntry[] ) {
	return function marked ( txt: string ) {
		const modTxt = txt.replace(/\[\[([^\n]+?), ([^\n]+?\.)\]\]/g, replaceSelfLink)
		return modTxt
	}

	function replaceSelfLink ( _full: string, word: string, wordClass: string ) {
		const found = findEntry(word, wordClass)
		return `[${word}, ${wordClass}](${new URL(`/view/${found ? found.id : 404}/${word}`, process.env.BLICTIONARY_URL!)})`
	}

	function findEntry ( word: string, wordClass: string ) {
		const found = allEntries.find(( entry ) => (
			entry.word === word && ( Array.isArray(entry.class) ? entry.class.includes(wordClass) : entry.class === wordClass )
		))
		return found
	}	
}

function wordClassToString ( wordClass: string | string[] ) {
	if (!Array.isArray(wordClass)) return `*${wordClass}*`

	let string = ""
	for (let i = 0; i < wordClass.length; i++) {
		string += `*${wordClass[i]}*`

		if (i < wordClass.length - 1 && wordClass.length >= 3) {
			string += ", "
		}
		
		if (i == wordClass.length - 2) {
			string += wordClass.length === 2 ? " and " : "and "
		}
	}

	return string
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
