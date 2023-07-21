const leftcolumns = [
    {
        name: 'Files',
        prop: 'fileName',
        size: 440,
        autoSize: true,
        cellTemplate: leftAlignTemplate,
        filter: true
    },
    {
        name: '#',
        prop: 'count',
        size: 30,
        sortable: true,
        filter: 'number'
    },
    {
        name: 'Size',
        prop: 'size',
        size: 65,
        autoSize: true,
        sortable: true,
        cellTemplate: prettySize,
        filter: 'number'
    },
    {
        name: 'Freeable',
        prop: 'recoverable',
        size: 65,
        autoSize: true,
        resize: true,
        sortable: true,
        cellTemplate: recoverableSize,
        //compare: numericCompare,
        filter: 'number'
    }
];

