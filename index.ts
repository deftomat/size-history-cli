import { cyan, red, yellow } from 'chalk';
import fs from 'fs';
import meow from 'meow';
import { resolve as resolvePath } from 'path';
import Table from 'tty-table';
import { formatSize, getSizeWithHistory, Size, SizeWithHistory } from './src/size';

const cli = meow(
  `
    Usage
      $ size-history <path> [-t|--table]

    Options
      -t, --table  Render table with previous results

    Examples
      $ size-history page.html --table
`,
  {
    flags: {
      table: {
        type: 'boolean',
        alias: 't'
      }
    }
  }
);

run(cli.input[0], cli.flags);

async function run(input = '.', flags) {
  const path = resolvePath(input);
  if (!fs.existsSync(path)) {
    console.error(red('Path not found!'));
    process.exit(1);
  }

  const size = await getSizeWithHistory(path);
  const asTable = flags.table && size.history.length > 0;

  if (fs.lstatSync(path).isFile()) {
    if (asTable) {
      renderHistoryTable(size, [
        { label: 'Real', getValue: size => size.real },
        { label: 'Gzip (q=9)', getValue: size => size.gzip },
        { label: 'Brotli (q=9)', getValue: size => size.brotli }
      ]);
    } else if (size.current.brotli || size.current.gzip) {
      renderSize('Real:        ', size, 'real');
      renderSize('Gzip (q=9):  ', size, 'gzip');
      renderSize('Brotli (q=9):', size, 'brotli');
    } else {
      renderSize('File size:', size, 'real');
    }
  } else if (asTable) {
    renderHistoryTable(size, [{ label: 'Directory size', getValue: size => size.real }]);
  } else {
    renderSize('Directory size:', size, 'real');
  }
}

function renderSize(
  label: string,
  { current, history: [previousSize] }: SizeWithHistory,
  type: keyof Size
) {
  if (current[type] == null) return;
  const formatted = formatSize(current[type], previousSize ? previousSize[type] : undefined);
  console.info(yellow(label), formatted);
}

function renderHistoryTable(
  { current, history }: SizeWithHistory,
  columns: Array<{ label: string; getValue: (size: Size) => number | undefined }>
) {
  const header = [
    { value: 'Time', width: 25 },
    ...columns.map(({ label }) => ({ value: label, width: 25 }))
  ];

  const [previousSize] = history;

  const rows = [
    [
      'Current',
      ...columns.map(({ getValue }) =>
        formatSize(getValue(current), previousSize ? getValue(previousSize) : undefined)
      )
    ],
    ...history.map(entry => {
      return [
        new Date(entry.at).toLocaleString(),
        ...columns.map(({ getValue }) => formatSize(getValue(entry)))
      ];
    })
  ];

  const table = Table(header, rows, {
    paddingLeft: 1,
    paddingRight: 1,
    borderStyle: 1,
    paddingBottom: 0,
    marginTop: 0,
    marginLeft: 0,
    headerColor: 'cyan',
    borderColor: 'white',
    headerAlign: 'center',
    align: 'left'
  });

  if (history.length > 0) {
    console.info(cyan(`\nThe last ${history.length + 1} changes:`));
  }
  console.info(table.render());
}
