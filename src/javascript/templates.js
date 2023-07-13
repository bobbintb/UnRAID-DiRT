const dateTimeTemplate = (createElement, props) => {
  const formattedTime = convertTimeStamp(props.model[props.column.prop]);
  return createElement('span', {}, formattedTime);
};

const leftAlignTemplate = (createElement, props) => {
  const cell = createElement('div', {
    style: {
      textAlign: 'left'
    }
  }, props.model[props.column.prop]);
  return cell;
};

const prettySize = (createElement, props) => {
  const formattedSize = convertFileSize(props.model.size);
  return createElement('span', {}, formattedSize);
}

/* const multilineRenderer = (createElement, props) => {
  const lines = props.model[props.prop] || ''; // Retrieve the value for the specific cell property
  const lineArray = lines.split('\n'); // Split the lines by the line feed character
  console.log('lineArray');
  console.log(lineArray);
  // Create a div element containing multiple line elements
  const content = createElement('div', null, lineArray.map(line => createElement('div', null, line)));

  return createElement('div', { class: 'multiline-cell' }, content);
}; */

const queue_link = (createElement, props, item) => {
  let linkClass = 'fa fa-trash';
  if (props.model.action === 'link' || 'fa fa-link' === 'delete') {
    linkClass = 'fa fa-link';
  }
  return createElement('div', {
    class: linkClass,
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#f2f2f2'
    },
  });
};

const fa_link = (createElement, props) => {
  fqfn = props.model.dir + props.model.file
  if (originals[props.model.fullHash] == fqfn) {
    state = true;
  } else {
    state = false;
  }
  return createElement('button', {
    class: 'fa fa-link',
    disabled: state,
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#f2f2f2'
    },
    onClick: () => {
      props.model.action = 'link';
      checkQueue(props.model, 'queue');
      popRightGrid();
    },
  });
};

const fa_link_header = (createElement, props) => {
  return createElement('button', {
    class: 'fa fa-link',
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#61656a'
    },
    onClick: () => {
      checkQueue(props.model, 'linkAll');
    },
  });
};

const fa_trash = (createElement, props) => {
  fqfn = props.model.dir + props.model.file
  if (originals[props.model.fullHash] == fqfn) {
    state = true;
  } else {
    state = false;
  }
  return createElement('button', {
    class: 'fa fa-trash',
    disabled: state,
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#f2f2f2'
    },
    onClick: () => {
      props.model.action = 'delete';
      checkQueue(props.model, 'queue');
      popRightGrid();
    },
  });
};

const fa_trash_queue = (createElement, props) => {
  return createElement('button', {
    class: 'fa fa-trash',
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#f2f2f2'
    },
    onClick: () => {
      fqfn = props.model.file
      delete queue[fqfn];
      localStorage.setItem('queue', JSON.stringify(queue));
      popRightGrid();
    },
  });
};

const fa_trash_header = (createElement, prop) => {
  return createElement('button', {
    class: 'fa fa-trash',
    style: {
      minWidth: 'initial',
      margin: 'initial',
      color: '#61656a'
    },
    onClick: () => {
      checkQueue(prop.model, 'deleteAll');
    },
  });
};

const radioTemplate = (createElement, props) => {
  
   if (originals[props.model.fullHash] == fqfn) {
    state = true;
  } else {
    state = false;
  }
  const input = createElement("input", {
    type: "radio",
    checked: props.model["checked"],
    checked: state,
    resize: false,
    style: {
      position: "relative",
      transform: "translate(-15%, 25%)"
    },
    onChange(e) {
      if (e.target.checked) {
        fqfn = props.model.dir + props.model.file;
        deselectOtherRadios();
        originals[props.model.fullHash] = fqfn;
        addToLocalStorage('originals')
        //props.model["checked"] = true;
      }
    },
  });
  return input;
};

const recoverableSize = (createElement, props) => {
  if (props.model.fullHash === 'Total') {
    return convertFileSize(props.model.recoverable);
  } else {
    const recoverSize = convertFileSize([props.model.count - 1] * props.model.size);
    return createElement('span', {}, recoverSize);
  }
}
