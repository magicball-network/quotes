# LBA Gamequotes


# Development

The `jq` utility is used for a lot of parts in the development process.

## Building

The quotes are stored in separate JSON files for each game, based on the TEXT
resource file entry.

These sperate files can be bundled into a single JSON file with the 
`bin/merge.sh` shell script.

```
bin/merge.sh lba1 lba2
```

