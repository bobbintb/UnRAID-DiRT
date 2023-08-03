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
        size: 50,
        sortable: true,
        textAlign: 'left',
        //columnTemplate: leftAlignTemplate_header,
        filter: 'number'
    },
    {
        name: 'Size',
        prop: 'size',
        size: 75,
        autoSize: true,
        sortable: true,
        cellTemplate: prettySize,
        //columnTemplate: leftAlignTemplate_header,
        filter: 'number'
    },
    {
        name: 'Freeable',
        prop: 'recoverable',
        size: 85,
        autoSize: true,
        resize: true,
        sortable: true,
        cellTemplate: recoverableSize,
        //compare: numericCompare,
        filter: 'number'
    }
];

