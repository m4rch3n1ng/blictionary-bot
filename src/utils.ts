import { dirname } from "path"
import { fileURLToPath } from "url"

export const __dirname = dirname(dirname(fileURLToPath(import.meta.url)))

export function writeProgress ( channels: number, threads: number, total: number ) {
	// todo more stats
	return `collecting messages from ${total} channels [${channels}/${total}]  [${threads} threads]`
}
