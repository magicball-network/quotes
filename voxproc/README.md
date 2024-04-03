This subproject extracts and converts the game's VOX files to so that they can be referenced in the quotes.

Usage:

```
npm start <mode> <glob pattern>
```

`<mode>` is either `lba1` or `lba2`.

`<glob pattern>` is the path with mask to the vox files to process. For example `c:\games\lba1\vox\en_*.vox`.

The converted files will be written to the `dist` directory of this subdirectory.
The result should be placed in the `dist` directory of the parent project so that they are referenced during the `build:json` job.
