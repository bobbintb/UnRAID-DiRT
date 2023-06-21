const bottomcolumns = [
  {
    size: 30,
    columnType: "regular",
    cellTemplate: fa_trash,
    columnTemplate: fa_trash_header,
  },
  {
    size: 30,
    columnType: "regular",
    cellTemplate: fa_link,
    columnTemplate: fa_link_header,
  },
  {
    name: 'Directory',
    prop: 'dir',
    size: 450,
    resize: true,
    overflow: 'auto',
    //autoSize: true,
    cellTemplate: leftAlignTemplate
  },
  {
    name: 'File Name',
    prop: 'file',
    size: 250,
    //autoSize: true,
    resize: true,
    cellTemplate: leftAlignTemplate
  },
  {
    name: 'Links',
    prop: 'st_nlink',
    size: 35
  },
  {
    name: 'Size',
    prop: 'st_size',
    size: 65,
    cellTemplate: prettySize,
    compare: numericCompare
  },
  {
    name: 'Last Accessed',
    prop: 'st_atime',
    size: 150,
    cellTemplate: dateTimeTemplate,
    compare: numericCompare
  },
  {
    name: 'Last Modified',
    prop: 'st_mtime',
    size: 150,
    cellTemplate: dateTimeTemplate,
    compare: numericCompare
  },
  {
    name: 'Last Metadata Change',
    prop: 'st_ctime',
    size: 150,
    cellTemplate: dateTimeTemplate,
    compare: numericCompare
  },
  {
    prop: 'og-radio',
    autoSize: true,
    size: 30,
    cellTemplate: radioTemplate
  }
];

const rows = {};

function deselectOtherRadios() {
  var allModels = bottomGrid.source;
  allModels.forEach((model) => {
    s1 = model.dir + model.file;
    s2 = originals[model.fullHash];
    if (s1.trim() !== s2.trim()) {
      model["checked"] = false;
    } else {
      model["checked"] = true;
    }
  });
  bottomGrid.refresh();
};