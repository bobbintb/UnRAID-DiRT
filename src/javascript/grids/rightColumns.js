const rightcolumns = [
    {
        name: 'Action',
        prop: 'action',
        size: 40,
        cellTemplate: queue_link
    },
    {
        name: 'File(s)',
        prop: 'file',
        size: 700,
        //size: rightcolumns.action.size,
        autoSize: true,
        cellTemplate: leftAlignTemplate,
        //class: 'multiline-cell'
    },
    {
        name: 'Size',
        prop: 'size',
        size: 65,
        cellTemplate: prettySize,
        autoSize: true
    },
    {
        size: 30,
        columnType: "regular",
        cellTemplate: fa_trash_queue,
        //columnTemplate: fa_trash_header,
      }
];
