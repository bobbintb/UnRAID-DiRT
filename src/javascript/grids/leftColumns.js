const leftcolumns = [
    {
        name: 'Hash Group',
        prop: 'fullHash',
        size: 440,
        autoSize: true,
        cellTemplate: leftAlignTemplate,
        filter: false
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
        compare: numericCompare,
        filter: 'number'
    }
];

