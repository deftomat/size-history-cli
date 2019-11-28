# size-history-cli

Get and remember the file or directory size.

Gzip and Brotli sizes will be calculated automatically for files commonly served by web servers.

## Installation

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

- `-t | --table`: render table with previous results
