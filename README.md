# size-history-cli

Get and remember the file or directory size.

Gzip and Brotli sizes will be calculated automatically for every compressible file which is smaller than 32MB.

## Installation

> ⚠️ Tool is probably not working on Windows!

```
npm install --global size-history-cli
```

## Usage

```
$ size-history <path> [-t|--table]
```

**Example:**

```
$ size-history page.html -t
```

**Options:**

- `-t | --table`: render table with previous results (works only when there is at least one history record)
