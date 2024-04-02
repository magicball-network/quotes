/**
 * Extract the contents of the vox files and organizes it according to the game quote layout.
 */
import fs from "node:fs/promises";
import path from "node:path";
import glob from "glob-promise";
import HQRLib from "@lbalab/hqr";
import ffmpeg from "ffmpeg-cli";

const vox2text = {
	lba1: {
		gam: "06",
		// Citadel Island
		"000": "08",
		// Principal Island
		"001": "10",
		// Desert Island
		"002": "12",
		// Proxima Island
		"003": "14",
		// Rebellion Island
		"004": "16",
		// Southern range
		"005": "18",
		// Northern range
		"006": "20",
		// Tippet Island
		"007": "22",
		// Brundle Island
		"008": "24",
		// Fortress Island
		"009": "26",
		// Polar Island
		"010": "28",
	},
	lba2: {},
};

function identifyFile(mode, file) {
	let fileId = path.basename(file).match(/^([a-z]{2})_(.*)\.vox$/i);
	if (!fileId) {
		console.log("Not a recognized vox file:", file);
		return false;
	}
	return {
		file,
		lang: fileId[1].toLocaleLowerCase(),
		voxId: fileId[2].toLocaleLowerCase(),
		textId: vox2text[mode][fileId[2].toLocaleLowerCase()],
	};
}

function formatOutputFile(infile) {
	var of = path.parse(infile);
	return `${of.dir}${path.sep}${of.name}.webm`;
}

async function combineOutputs(inputfiles, outfile) {
	var concatFile = outfile + ".lst";
	var data = "";
	for (let file of inputfiles) {
		data += `file '${path.basename(file)}'\n`;
	}
	await fs.writeFile(concatFile, data);
	return ffmpeg.run(`-y -f concat -i ${concatFile} -c:a copy ${outfile}`);
}

async function convertLba1(infile, outfile, silencePad) {
	// Add some silence to files which will be combined to a single one
	let silencefilter = silencePad ? ",apad=pad_dur=0.5" : "";
	// afftdn,anlmdn filters perform quite a bit of noise reduction
	return ffmpeg.run(
		`-y -i ${infile} -af afftdn,anlmdn=s=7:p=0.002:r=0.002:m=15${silencefilter} -c:a libvorbis -qscale:a 5 ${outfile}`,
	);
}

async function extractEntry(mode, outdir, file, index, entry) {
	if (entry.content.byteLength === 0 && entry.hiddenEntries.length === 0) {
		return;
	}
	let basename = ("000" + (index + 1)).substr(-3);
	if (file.lang !== "en") {
		basename += "-" + file.lang;
	}
	let ext = mode === "lba1" ? ".voc" : ".wav";
	let entryData = [entry, ...entry.hiddenEntries];
	let convertedFiles = [];
	let promises = [];
	let offset = 0;
	for (let data of entryData) {
		if (!data || data.content.byteLength === 0) {
			continue;
		}
		++offset;
		let isLastFile = entryData.length === offset;
		let suffix =
			entryData.length === 1 ? "" : "_" + ("000" + offset).substr(-3);
		let destfile = path.join(outdir, `${basename}${suffix}${ext}`);
		let convertedFile = formatOutputFile(destfile);
		convertedFiles.push(convertedFile);
		if (mode === "lba1") {
			promises.push(
				fs
					// Need to correct the first byte
					.writeFile(destfile, ["C", data.content.slice(1)])
					.then(() =>
						convertLba1(destfile, convertedFile, !isLastFile),
					)
					.then(() => convertedFile),
			);
		} else if (mode === "lba2") {
		}
	}
	let result = Promise.all(promises);
	if (entryData.length > 1) {
		return result.then(() => {
			let resultFile = formatOutputFile(
				path.join(outdir, `${basename}.xxx`),
			);
			combineOutputs(convertedFiles, resultFile);
			return resultFile;
		});
	} else {
		return result.then((e) => (e.length === 1 ? e[0] : null));
	}
}

async function moveToDest(file) {
	let dest = file.split(path.sep);
	dest[0] = "dist";
	dest = dest.join(path.sep);
	await fs.mkdir(path.dirname(dest), { recursive: true });
	return fs.copyFile(file, dest);
}

async function procVox(mode, file) {
	console.log("Processing file:", file);
	const data = await fs.readFile(file.file);
	const hqr = HQRLib.HQR.fromArrayBuffer(
		data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
	);
	console.log("Number of entries: ", file.file, hqr.entries.length);
	const outdir = `work/${mode}/${file.textId}`;
	await fs.mkdir(outdir, { recursive: true });
	let promises = [];
	for (let i = 0; i < hqr.entries.length; ++i) {
		let entry = hqr.entries[i];
		if (entry) {
			promises.push(
				extractEntry(mode, outdir, file, i, entry).then(moveToDest),
			);
		}
	}
	return Promise.all(promises).then((e) => e.flat());
}

async function procGlob(mode, pattern) {
	if (!vox2text[mode]) {
		throw new Error(`Unknown mode: ${mode}`);
	}
	let files = await glob(pattern.replace(/\\/g, "/"));
	let promises = [];
	for (let file of files) {
		let fileId = identifyFile(mode, file);
		if (fileId) {
			promises.push(procVox(mode, fileId));
		}
	}
	return Promise.all(promises).then((e) => e.flat());
}

if (process.argv.length !== 4) {
	throw new Error(
		`Usage: ${process.argv[0]} ${process.argv[1]} <lba1|lba2> <glob pattern to vox files>`,
	);
}
await procGlob(process.argv[2], process.argv[3]);
