/* This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Given data list will be grouped like:
 * [{
 *   index: 'A',
 *   dataList: [item1, item2]
 * }, {
 *   index: 'B',
 *   dataList: [item3, item4]
 * }]
 *
 * Options:
 *   - dataList
 *     Data list that will be grouped and rendered.
 *   - dataIndexer
 *     Function to calc the index of given item.
 *   - indexSorter
 *     Function to sort item index. see more in Array.sort
 *   - dataIdentifier
 *     Function to return the identical string which will be used to judge if two object equals
 *   - renderFunc
 *     Function to render html node for the given item, usually, event listeners will be added.
 *   - container
 *     List container
 *   - ondatachange
 *     Function to be invoked if the data is added or removed
 */
var GroupedList = function(options) {
  this.initialize(options);
  this.DEFAULT_INDEX = '__DEF_INDEX__';
};

GroupedList.prototype = {
  initialize: function(options) {
    this.options = extend({
      dataList: null,
      dataIndexer: null,
      dataSorterName: null,
      dataSorter: this._dataSorter,
      disableDataIndexer: false,
      indexSorter: this._dictSorter,
      dataIdentifier: this._identifyById,
      renderFunc: null,
      container: document.body,
      ondatachange: function() {}
    }, options);

    if (!this.options.dataList || !this.options.dataIndexer || !this.options.renderFunc) {
      throw new Error('Init arguments are not complete.');
    }
  },

  _dictSorter: function gl_dictSorter(a, b) {
    if (a.index === b.index) {
      return 0;
    } else if (a.index < b.index) {
      return -1;
    }
    return 1;
  },

  _dataSorter: function gl_dataSorter(a, b) {
    var aSorter = a['dataSorterName'].toString();
    var bSorter = b['dataSorterName'].toString();
    var length = aSorter.length < bSorter.length ? aSorter.length : bSorter.length;
    for (var i = 0; i < length; i++) {
      if (aSorter[i] == bSorter[i]) {
        continue;
      } else if (aSorter[i] < bSorter[i]) {
        return -1;
      } else {
        return 1;
      }
    }
    if (aSorter.length == bSorter.length) {
      return 0;
    } else if (aSorter.length < bSorter.length) {
      return -1;
    } else {
      return 1;
    }
  },

  _identifyById: function gl_identifyById(dataObj) {
    if (dataObj.id) {
      return dataObj.id;
    } else {
      return dataObj.toString();
    }
  },

  _getGroup: function gl_getGroup(index) {
    var position = this._getGroupPosition(index);
    if (position < 0) {
      return null;
    }

    return this._groupedData[position];
  },

  _getGroupPosition: function gl_getGroupPosition(index) {
    for (var i = 0; i < this._groupedData.length; i++) {
      if (String(this._groupedData[i].index) === String(index)) {
        return i;
      }
    }
    return -1;
  },

  _addToGroup: function gl_addToGroup(dataObj) {
    var self = this;
    var index = this.options.dataIndexer(dataObj);
    index = !index ? self.DEFAULT_INDEX : index;

    var group = this._getGroup(index);
    if (!group) {
      group = {};
      group.index = index;
      group.dataList = [];
      this._groupedData.push(group);
    }
    if (this.options.dataSorterName) {
      dataObj['dataSorterName'] = dataObj[this.options.dataSorterName];
      group.dataList.push(dataObj);
      group.dataList.sort(this.options.dataSorter);
    } else {
      group.dataList.push(dataObj);
    }
    return group;
  },

  /**
   * Remove data object, and return the contained group
   */
  _removeFromGroup: function gl_removeFromGroup(dataObj) {
    var self = this;
    var index = this.options.dataIndexer(dataObj);
    index = !index ? self.DEFAULT_INDEX : index;

    var group = this._getGroup(index);
    if (!group) {
      return null;
    }
    var newDataList = removeFromArray(function(obj) {
      return self.options.dataIdentifier(obj) === self.options.dataIdentifier(dataObj);
    }, group.dataList);

    group.dataList = newDataList;
    // Remove the empty group
    if (newDataList.length === 0) {
      removeFromArray(group, this._groupedData);
    }

    return group;
  },

  _sortGroup: function gl_sortGroup() {
    this._groupedData.sort(this.options.indexSorter);
  },

  _groupDataList: function gl_groupData() {
    this._groupedData = [];
    var self = this;

    this.options.dataList.forEach(function(dataObj) {
      self._addToGroup(dataObj);
    });

    this._sortGroup();
  },

  _renderIndex: function gl_renderIndex(index) {
    var div = document.createElement('div');
    div.className = 'data-index';
    div.textContent = index;
    return div;
  },

  _renderDataList: function gl_render() {
    var self = this;
    this._groupedData.forEach(function(group) {
      var groupElem = self._renderGroup(group);
      self.options.container.appendChild(groupElem);
    });
  },

  _renderGroup: function gl_renderGroup(group) {
    var groupElem = document.createElement('div');
    groupElem.id = this._getGroupElemId(group.index);
    if (this.options.disableDataIndexer == false) {
      groupElem.appendChild(this._renderIndex(group.index));
    }
    var self = this;
    // Render data list
    group.dataList.forEach(function(dataObj) {
      var dataElem = self.options.renderFunc(dataObj);
      if (dataElem) {
        dataElem.dataset.dataIdentity = self.options.dataIdentifier(dataObj);
        groupElem.appendChild(dataElem);
      }
    });

    return groupElem;
  },

  _getGroupElemId: function gl_getGroupElemId(index) {
    return 'id-grouped-data-' + index;
  },

  _getGroupElem: function gl_getGroupElem(index) {
    return $id(this._getGroupElemId(index));
  },

  render: function gl_render() {
    this._groupDataList();
    this._renderDataList();
  },

  add: function gl_add(dataObj) {
    var group = this._addToGroup(dataObj);
    this._sortGroup();
    var groupElem = this._getGroupElem(group.index);
    if (groupElem) {
      var dataIndexInGroup = group.dataList.indexOf(dataObj);
      var elem = this.options.renderFunc(dataObj);
      if (elem) {
        elem.dataset.dataIdentity = this.options.dataIdentifier(dataObj);
        if (dataIndexInGroup + 1 < group.dataList.length) {
          var dataAfter = groupElem.childNodes[dataIndexInGroup + 1];
          groupElem.insertBefore(elem, dataAfter);
        } else {
          groupElem.appendChild(elem);
        }
      }
      this.options.ondatachange();
      return;
    }

    // If group is newly created, then render the whole group
    groupElem = this._renderGroup(group);
    var position = this._getGroupPosition(group.index);
    if (position == this._groupedData.length - 1) {
      this.options.container.appendChild(groupElem);
    } else {
      var groupAfter = this._groupedData[position + 1];
      this.options.container.insertBefore(groupElem, this._getGroupElem(groupAfter.index));
    }
    this.options.ondatachange();
  },

  remove: function gl_remove(dataObj) {
    var group = this._removeFromGroup(dataObj);

    var groupElem = this._getGroupElem(group.index);

    // remove whole group
    if (group.dataList.length === 0) {
      groupElem.parentNode.removeChild(groupElem);
      this._groupedData.splice(this._groupedData.indexOf(group), 1);
    } else {
      for (var i = 0; i < groupElem.childNodes.length; i++) {
        var child = groupElem.childNodes[i];
        if (child.dataset.dataIdentity == this.options.dataIdentifier(dataObj)) {
          child.parentNode.removeChild(child);
          break;
        }
      }
    }

    this.options.ondatachange();
  },

  getGroupedData: function gl_getGroupedData() {
    return this._groupedData;
  },

  count: function gl_count() {
    var count = 0;
    if (this._groupedData.length == 0) {
      return count;
    }
    this._groupedData.forEach(function(group) {
      count += group.dataList.length;
    });

    return count;
  }
};

function SendSMSDialog(options) {
  this.initialize(options);
}

SendSMSDialog.closeAll = function() {
  var evt = document.createEvent('Event');
  evt.initEvent('SendSMSDialog:show', true, true);
  document.dispatchEvent(evt);
};

SendSMSDialog.prototype = {
  initialize: function(options) {
    this.options = extend({
      onclose: emptyFunction
    }, options);

    this._modalElement = null;
    this._mask = null;
    this._build();
  },

  _build: function() {
    var self = this;
    this._mask = document.createElement('div');
    this._mask.className = 'modal-mask';
    document.body.appendChild(this._mask);
    var templateData = {
      type: this.options.type,
      tel: [],
      body: '',
      textCount: '',
      senderCount: ''
    };
    if (this.options.type == 'single') {
      if (this.options.tel && this.options.tel.length > 0) {
        for (var i = 0; i < this.options.tel.length; i++) {
          templateData.tel.push(this.options.tel[i].value);
        }
      }
    } else {
      if (this.options.tel && this.options.tel.length > 0) {
        templateData.tel.push(this.options.tel[0]);
        var senderNum = 0;
        var senders = this.options.tel[0].split(';');
        senderNum = senders.length;
        for (var i = 0; i < senders.length; i++) {
          if (senders[i] == "") {
            senderNum--;
          }
        }
        templateData.senderCount = _('send-sms-count', {
          n: senderNum
        });
      }
    }
    var textLen = 0;
    if (this.options.bodyText) {
      textLen = this.options.bodyText.length;
    }
    templateData.textCount = _('text-sms-count', {
      n: textLen
    });
    if (this.options.bodyText) {
      templateData.body = this.options.bodyText;
    }

    this._modalElement = document.createElement('div');
    this._modalElement.className = 'modal-dialog';
    this._modalElement.innerHTML = tmpl('tmpl_sendSms_dialog', templateData);
    document.body.appendChild(this._modalElement);

    this._adjustModalPosition();
    this._makeDialogCancelable();

    // Translate l10n value
    navigator.mozL10n.translate(this._modalElement);

    // Only one modal dialog is shown at a time.
    this._onModalDialogShown = function(event) {
      // Show a popup dialog at a time.
      if (event.targetElement == self._modalElement) {
        return;
      }
      self.close();
    }
    document.addEventListener('SendSMSDialog:show', this._onModalDialogShown);
    // Make sure other modal dialog has a chance to close itself.
    this._fireEvent('SendSMSDialog:show');
    // Tweak modal dialog position when resizing.
    this._onWindowResize = function(event) {
      self._adjustModalPosition();
    };
    window.addEventListener('resize', this._onWindowResize);
  },

  _makeDialogCancelable: function() {
    var self = this;
    var closeBtn = $expr('.sendSms-dialog-header-x', self._modalElement)[0];
    closeBtn.hidden = false;
    closeBtn.addEventListener('click', self.close.bind(self));
    var okBtn = $expr('.button-send', self._modalElement)[0];
    okBtn.hidden = false;
    if (self.options.type == 'single') {
      okBtn.addEventListener('click', self.sendSingle.bind(self));
    } else {
      okBtn.addEventListener('click', self.send.bind(self));
    }

    okBtn.addEventListener('keydown', function(event) {
      if (event.keyCode == 27) {
        self.close();
      }
    });
    var cancelBtn = $expr('.button-cancel', self._modalElement)[0];
    cancelBtn.hidden = false;
    cancelBtn.addEventListener('click', self.close.bind(self));

    $id('sms-text-content').addEventListener('keyup', function onclick_addNewSms(event) {
      var header = _('text-sms-count', {
        n: this.value.length
      });
      $id('text-count').innerHTML = header;
    });

    if (self.options.type != 'single') {
      $id('address').addEventListener('keydown', function onclick_addNewSms(event) {
        var senders = this.value.split(';');
        var senderNum = senders.length;
        for (var i = 0; i < senders.length; i++) {
          if (senders[i] == "") {
            senderNum--;
          }
        }
        var header = _('send-sms-count', {
          n: senderNum
        });
        $id('sender-count').innerHTML = header;
      });
      $id('button-add-contact').addEventListener('click', function(event) {
        var loadingGroupId = animationLoading.start();
        CMD.Contacts.getAllContacts(function onresponse_getAllContacts(message) {
          animationLoading.stop(loadingGroupId);
          var dataJSON = JSON.parse(message.data);
          new SelectContactsDialog({
            contactList: dataJSON,
            onok: self._selectContacts
          });
        }, function onerror_getAllContacts(message) {
          animationLoading.stop(loadingGroupId);
          log('Error occurs when fetching all contacts.');
        });
      });
    }
    // Make sure we can close the dialog by hitting ENTER or ESC
    okBtn.focus();
  },

  _adjustModalPosition: function() {
    var container = $expr('.sendSms-dialog', this._modalElement)[0];
    var documentHeight = document.documentElement.clientHeight;
    var containerHeight = container.clientHeight;
    container.style.top = (documentHeight > containerHeight ? (documentHeight - containerHeight) / 2 : 0) + 'px';
  },

  _selectContacts: function(data) {
    var titleElem = $expr('.input-contact', this._modalElement)[0];
    if ((titleElem.value.length > 0) && (titleElem.value[titleElem.value.length - 1] != ";")) {
      titleElem.value += ';';
    }
    for (var i = 0; i < data.length; i++) {
      var contact = JSON.parse(data[i]);
      if (contact.tel && contact.tel.length > 0) {
        var sendStr = contact.name + "(" + contact.tel[0].value + ");";
        var searchStr = contact.tel[0].value + ";";
        if (titleElem.value.contains(searchStr)) {
          titleElem.value = titleElem.value.replace(searchStr, sendStr);
        } else {
          if (!titleElem.value.contains("(" + contact.tel[0].value + ")")) {
            titleElem.value += sendStr;
          }
        }
      }
    }
    var senders = titleElem.value.split(';');
    var senderNum = senders.length;
    for (var i = 0; i < senders.length; i++) {
      if (senders[i] == "") {
        senderNum--;
      }
    }
    var header = _('send-sms-count', {
      n: senderNum
    });
    $id('sender-count').innerHTML = header;
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('SendSMSDialog:show', this._onModalDialogShown);
    window.removeEventListener('resize', this._onWindowResize)
    this.options.onclose();
  },

  sendSingle: function() {
    var tel = $id('select-contact-tel-button');
    var message = $id('sms-text-content');
    var sender = [tel.value];
    var self = this;
    if (!tel.value) {
      new AlertDialog(_('EmptyPhone'));
      return;
    }
    var loadingGroupId = animationLoading.start();
    message.readOnly = true;
    CMD.SMS.sendSMS(JSON.stringify({
      number: sender,
      message: message.value
    }), function onSuccess_sendSms(event) {
      if (!event.result) {
        self._mask.parentNode.removeChild(self._mask);
        self._modalElement.parentNode.removeChild(self._modalElement);
        self._mask = null;
        self._modalElement = null;
        document.removeEventListener('SendSMSDialog:show', self._onModalDialogShown);
        window.removeEventListener('resize', self._onWindowResize);
        animationLoading.stop(loadingGroupId);
        self.options.onclose();
      }
    }, function onError_sendSms(event) {
      animationLoading.stop(loadingGroupId);
    });
  },

  send: function() {
    var number = $id('address').value.split(';');
    var message = $id('sms-text-content');
    var sender = [];
    var self = this;
    message.readOnly = true;
    number.forEach(function(item) {
      var start = item.indexOf("(");
      var end = item.indexOf(")");
      if (start >= 0 && end > 0) {
        sender.push(item.slice(start + 1, end));
      } else if (item != "") {
        sender.push(item);
      }
    });
    if (!sender.length) {
      new AlertDialog(_('EmptyPhone'));
      return;
    }
    var loadingGroupId = animationLoading.start();
    CMD.SMS.sendSMS(JSON.stringify({
      number: sender,
      message: message.value
    }), function onSuccess_sendSms(event) {
      if (!event.result) {
        self._mask.parentNode.removeChild(self._mask);
        self._modalElement.parentNode.removeChild(self._modalElement);
        self._mask = null;
        self._modalElement = null;
        document.removeEventListener('SendSMSDialog:show', self._onModalDialogShown);
        window.removeEventListener('resize', self._onWindowResize);
        animationLoading.stop(loadingGroupId);
        self.options.onclose();
      }
    }, function onError_sendSms(e) {
      animationLoading.stop(loadingGroupId);
    });
  }
};

function SelectContactsDialog(options) {
  this.initialize(options);
}

SelectContactsDialog.prototype = {
  initialize: function(options) {
    this.options = extend({
      contactList: null,
      onok: emptyFunction
    }, options);
    this._modalElement = null;
    this._mask = null;
    this._build();
  },

  _build: function() {
    this._mask = document.createElement('div');
    this._mask.className = 'modal-mask';
    document.body.appendChild(this._mask);
    var templateData = {};
    this._modalElement = document.createElement('div');
    this._modalElement.className = 'modal-dialog';
    this._modalElement.innerHTML = tmpl('tmpl_select_contact_dialog', templateData);

    document.body.appendChild(this._modalElement);
    var closeBtn = $expr('.sendSms-dialog-header-x', this._modalElement)[0];
    closeBtn.hidden = false;
    closeBtn.addEventListener('click', this.close.bind(this));

    var cancelBtn = $expr('.button-cancel', this._modalElement)[0];
    cancelBtn.hidden = false;
    cancelBtn.addEventListener('click', this.close.bind(this));

    var okBtn = $expr('.button-send', this._modalElement)[0];
    okBtn.hidden = false;
    okBtn.addEventListener('click', this.select.bind(this));
    var self = this;
    okBtn.addEventListener('keydown', function(event) {
      if (event.keyCode == 27) {
        self.close();
      }
    });
    // Translate l10n value
    navigator.mozL10n.translate(this._modalElement);
    // Only one modal dialog is shown at a time.
    var self = this;
    this._onModalDialogShown = function(event) {
      // Show a popup dialog at a time.
      if (event.targetElement == self._modalElement) {
        return;
      }
      self.close();
    }
    document.addEventListener('SelectContactsDialog:show', this._onModalDialogShown);
    // Make sure other modal dialog has a chance to close itself.
    this._fireEvent('SelectContactsDialog:show');

    var contactSmallListContainer = $id('sendSms-smartlist-container');
    contactSmallListContainer.innerHTML = '';
    contactSmallList = new GroupedList({
      dataList: this.options.contactList,
      dataIndexer: function getContactIndex(contact) {
        var firstChar = contact.name[0].charAt(0).toUpperCase();
        var pinyin = makePy(firstChar);
        if (pinyin.length == 0) {
          return '#';
        }
        return pinyin[0].toUpperCase();
      },
      dataSorterName: 'name',
      renderFunc: this._createContactListItem,
      container: contactSmallListContainer,
    });
    contactSmallList.render();
    contactSmallList.getGroupedData().forEach(function(group) {
      group.dataList.forEach(function(contact) {
        if (( !! contact.photo) && (contact.photo.length > 0)) {
          var item = $id('smartlist-contact-' + contact.id);
          if ( !! item) {
            var img = item.getElementsByTagName('img')[0];
            img.src = contact.photo;
            item.dataset.avatar = contact.photo;
            img.classList.remove('avatar-default');
          }
        }
      });
    });
    var itemNum = $expr('#sendSms-smartlist-container .contact-list-item[data-checked="true"]').length;
    var header = _('contacts-selected', {
      n: itemNum
    });
    $id('select-contact-count').innerHTML = header;
  },

  _createContactListItem: function(contact) {
    var templateData = {
      name: '',
      tel: ''
    };
    if (contact.name) {
      templateData.name = contact.name.join(' ');
    }
    if (contact.tel && contact.tel.length > 0) {
      templateData.tel = contact.tel[0].value;
    }
    var elem = document.createElement('div');
    elem.classList.add('contact-list-item');
    if (contact.category && contact.category.indexOf('favorite') > -1) {
      elem.classList.add('favorite');
    }
    elem.innerHTML = tmpl('tmpl_select_contact_item', templateData);
    elem.dataset.contact = JSON.stringify(contact);
    elem.dataset.contactId = contact.id;
    elem.id = 'smartlist-contact-' + contact.id;
    elem.dataset.avatar = '';
    elem.dataset.checked = false;
    elem.onclick = function onclick_contact_list(event) {
      var target = event.target;
      var itemNum;
      var header;
      if (target instanceof HTMLLabelElement) {
        var item = $expr('label', elem)[0];
        var select = false;
        if (item.dataset.checked == 'false') {
          select = true;
        }
        elem.dataset.checked = elem.dataset.focused = item.dataset.checked = select;
        itemNum = $expr('#sendSms-smartlist-container .contact-list-item[data-checked="true"]').length;
        header = _('contacts-selected', {
          n: itemNum
        });
        $id('select-contact-count').innerHTML = header;
      } else {
        item = $expr('label', elem)[0];
        if (item) {
          item.dataset.checked = true;
        }
        elem.dataset.checked = elem.dataset.focused = true;
        itemNum = $expr('#sendSms-smartlist-container .contact-list-item[data-checked="true"]').length;
        header = _('contacts-selected', {
          n: itemNum
        });
        $id('select-contact-count').innerHTML = header;
      }
    };

    return elem;
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('SelectContactsDialog:show', this._onModalDialogShown);
  },
  select: function() {
    var ids = [];
    $expr('#sendSms-smartlist-container .contact-list-item[data-checked="true"]').forEach(function(item) {
      ids.push(item.dataset.contact);
    });
    this.options.onok(ids);
    this.close();
  }
};

function ProcessBar(options) {
  this.initialize(options);
}

ProcessBar.prototype = {
  initialize: function(options) {
    this.options = extend({
      sectionsNumber: 0,
      stepsPerSection: 0
    }, options);

    if (!this.options.sectionsNumber || !this.options.stepsPerSection) {
      new AlertDialog("Process bar initialize failed");
      return;
    }

    this.processbar = document.createElement('div');
    this.processbar.classList.add('processbar-container');
    this._pbDiv = document.createElement('div');
    this._pbDiv.classList.add('processbar');
    this.processbar.appendChild(this._pbDiv);
    this._ratio = 0;
    this._step = Math.round(100 / this.options.sectionsNumber) / this.options.stepsPerSection;
  },

  moveForward: function() {
    this._ratio += this._step;
    this._pbDiv.style.width = this._ratio + '%';
  },

  finish: function(count) {
    this._ratio = Math.round(count * 100 / this.options.sectionsNumber);
    this._pbDiv.style.width = this._ratio + '%';
  }
};

function FilesOPDialog(options) {
  this.initialize(options);
}

FilesOPDialog.prototype = {
  initialize: function(options) {
    this.options = extend({
      onclose: emptyFunction,
      title_l10n_id: '',
      processbar_l10n_id: '',
      type: -1,
      files: [],
      dir: '',
      callback: emptyFunction,
      alert_prompt: '',
      maxSteps: 0
    }, options);

    this._modalElement = null;
    this._mask = null;
    this._oldFileIndex = 0;
    this._fileIndex = 0;
    this._timer = null;
    this._steps = 0;
    this._processbar = null,
    this._build();
  },

  start: function() {
    var filesToBeDone = [];
    var filesCannotBeDone = [];
    var self = this;
    var filesIndicator = $id('files-indicator');
    filesIndicator.innerHTML = '0/' + this.options.files.length;

    setTimeout(function doCmd() {
      var cmd = '';
      switch (self.options.type) {
        case 1:
          cmd = 'adb push "' + self.options.files[self._fileIndex] + '" /sdcard/Music/';
          break;
        case 2:
          cmd ='adb pull "' + self.options.files[self._fileIndex].dataset.id + '" "' + decodeURI(self.options.dir) + '/' +
                self.options.files[self._fileIndex].dataset.name + '.' + self.options.files[self._fileIndex].dataset.type + '"';
          break;
        case 3:
          cmd = 'adb push "' + self.options.files[self._fileIndex] + '" /sdcard/Movies/';
          break;
        case 4:
          cmd = 'adb pull "' + self.options.files[self._fileIndex].dataset.videoUrl + '" "' + decodeURI(self.options.dir) + '/' +
              convertToOutputFileName(self.options.files[self._fileIndex].dataset.videoUrl) + '"';
          break;
        case 5:
          cmd = 'adb pull "' + self.options.files[self._fileIndex].dataset.picUrl + '" "' + decodeURI(self.options.dir) + '/' +
              convertToOutputFileName(self.options.files[self._fileIndex].dataset.picUrl) + '"';
          break;
        case 6:
          cmd = 'adb push "' + self.options.files[self._fileIndex] + '" /sdcard/DCIM/';
          break;
        case 7:
          CMD.Pictures.deletePicture(self.options.files[self._fileIndex], success, error);
          break;
        case 8:
          CMD.Musics.deleteMusic(self.options.files[self._fileIndex], success, error);
          break;
        case 9:
          CMD.Videos.deleteVideo(self.options.files[self._fileIndex], success, error);
          break;
      }
      if (cmd) {
        var req = navigator.mozFFOSAssistant.runCmd(cmd);
        req.onsuccess = success;
        req.onerror = error;
      }

      if (!self._timer) {
        self._timer = setInterval(function() {
          if (self._oldFileIndex == self._fileIndex) {
            if (self._steps < self.options.maxSteps * 0.9) {
              self._steps++;
              self._processbar.moveForward();
            }
          } else {
            self._oldFileIndex = self._fileIndex;
            self._steps = 0;
          }
        }, 100);
      }

      function success(e) {
        filesToBeDone.push(self.options.files[self._fileIndex]);
        self._fileIndex++;
        self._processbar.finish(filesToBeDone.length);
        filesIndicator.innerHTML = filesToBeDone.length + '/' + self.options.files.length;

        if (self._fileIndex != self.options.files.length) {
          doCmd();
          return;
        }
        clearInterval(self._timer);
        self._processbar.finish(self.options.files.length);
        self.closeAll();

        if (filesCannotBeDone.length > 0) {
          new AlertDialog(_(self.options.alert_prompt, {n:filesCannotBeDone.length}));
        }

        self.options.callback(filesToBeDone);
      }

      function error(e) {
        filesCannotBeDone.push(self.options.files[self._fileIndex]);
        self._fileIndex++;
        self._processbar.finish(filesToBeDone.length);
        filesIndicator.innerHTML = filesToBeDone.length + '/' + self.options.files.length;

        if (self._fileIndex != self.options.files.length) {
          doCmd();
          return;
        }
        clearInterval(self._timer);
        self._processbar.finish(self.options.files.length);
        self.closeAll();

        if (filesCannotBeDone.length > 0) {
          new AlertDialog(_(self.options.alert_prompt, {n:filesCannotBeDone.length}));
        }

        self.options.callback(filesToBeDone);
      }
    }, 0);
  },

  closeAll: function() {
    var evt = document.createEvent('Event');
    evt.initEvent('FilesOPDialog:show', true, true);
    document.dispatchEvent(evt);
  },

  _build: function() {
    this._mask = document.createElement('div');
    this._mask.className = 'modal-mask';
    document.body.appendChild(this._mask);

    this._modalElement = document.createElement('div');
    this._modalElement.className = 'modal-dialog';
    var templateData = {
      title_l10n_id: '',
      processbar_l10n_id: ''
    };
    if (this.options.title_l10n_id != '') {
      templateData.title_l10n_id = this.options.title_l10n_id;
    }
    if (this.options.processbar_l10n_id != '') {
      templateData.processbar_l10n_id = this.options.processbar_l10n_id;
    }
    this._modalElement.innerHTML = tmpl('tmpl_fileOP_dialog', templateData);
    var dlgBody = $expr('.select-multi-files-dialog-body', this._modalElement)[0];
    this._processbar = new ProcessBar({
      sectionsNumber: this.options.files.length,
      stepsPerSection: this.options.maxSteps
    });
    dlgBody.appendChild(this._processbar.processbar);
    document.body.appendChild(this._modalElement);
    this._adjustModalPosition();
    this._makeDialogCancelable();

    // Translate l10n value
    navigator.mozL10n.translate(this._modalElement);

    // Only one modal dialog is shown at a time.
    var self = this;
    this._onModalDialogShown = function(event) {
      // Show a popup dialog at a time.
      if (event.targetElement == self._modalElement) {
        return;
      }

      self.close();
    }
    document.addEventListener('FilesOPDialog:show', this._onModalDialogShown);

    // Make sure other modal dialog has a chance to close itself.
    this._fireEvent('FilesOPDialog:show');

    // Tweak modal dialog position when resizing.
    this._onWindowResize = function(event) {
      self._adjustModalPosition();
    };
    window.addEventListener('resize', this._onWindowResize);
  },

  _makeDialogCancelable: function() {
    var closeBtn = $expr('.select-multi-files-dialog-header-x', this._modalElement)[0];
    closeBtn.hidden = false;
    closeBtn.addEventListener('click', this.close.bind(this));

    var cancelBtn = $expr('.button-cancel', this._modalElement)[0];
    cancelBtn.hidden = false;
    cancelBtn.addEventListener('click', this.close.bind(this));

    var self = this;
  },

  _adjustModalPosition: function() {
    var container = $expr('.modal-container', this._modalElement)[0];
    var documentHeight = document.documentElement.clientHeight;
    var containerHeight = container.clientHeight;
    container.style.top = (documentHeight > containerHeight ? (documentHeight - containerHeight) / 2 : 0) + 'px';
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('FilesOPDialog:show', this._onModalDialogShown);
    window.removeEventListener('resize', this._onWindowResize)
    this.options.onclose();
  }
};

function ImageViewer(options) {
  this.initialize(options);
}

ImageViewer.prototype = {
  initialize: function(options) {
    this.options = extend({
      onclose: emptyFunction,
      count: 0,
      currentIndex: 0,
      getPictureAt: emptyFunction
    }, options);

    if (this.options.count <= 0) {
      new AlertDialog("selected picture doesn't exist");
      return;
    }
    this._modalElement = null;
    this._mask = null;
    this._build();
  },

  closeAll: function() {
    var evt = document.createEvent('Event');
    evt.initEvent('ImageViewer:show', true, true);
    document.dispatchEvent(evt);
  },

  _build: function() {
    this.options.getPictureAt(this.options.currentIndex, function(bCached, cachedUrl) {
      if (!bCached) {
        new AlertDialog('Cache picture failed');
        return;
      }

      this._mask = document.createElement('div');
      this._mask.className = 'mask';
      var container = document.getElementById('modal-container');
      container.appendChild(this._mask);

      this._modalElement = document.createElement('div');
      this._modalElement.className = 'dialog';

      var templateData = {
        cachedUrl: cachedUrl
      };
      this._modalElement.innerHTML = tmpl('tmpl_img_viewer', templateData);
      container.appendChild(this._modalElement);
      this._addListeners();

      var self = this;
      document.addEventListener('keypress', function(e) {
        self._fireEvent('ImageViewer:show', e.keyCode);
      });

      this._onImageViewerShown = function(event) {
        if (event.data && event.data == 37) {
          if ($id('gallery-view').dataset.shown == 'true') {
            self._showPreviousPic();
          }
          return;
        }
        if (event.data && event.data == 39) {
          if ($id('gallery-view').dataset.shown == 'true') {
            self._showNextPic();
          }
          return;
        }
        if (event.targetElement == self._modalElement) {
          return;
        }
      }
      document.addEventListener('ImageViewer:show', this._onImageViewerShown);

      this._fireEvent('ImageViewer:show');
    }.bind(this));
  },

  _showPreviousPic: function() {
    this.options.currentIndex -= 1;
    if (this.options.currentIndex < 0) {
      this.options.currentIndex += this.options.count;
    }
    this.options.getPictureAt(this.options.currentIndex, function(bCached, cachedUrl) {
      if (!bCached) {
        $id('pic-content').setAttribute('src', '');
        new AlertDialog('load cached picture failed');
        return;
      }
      $id('pic-content').setAttribute('src', cachedUrl);
    });
  },

  _showNextPic: function() {
    this.options.currentIndex += 1;
    if (this.options.currentIndex >= this.options.count) {
      this.options.currentIndex -= this.options.count;
    }
    this.options.getPictureAt(this.options.currentIndex, function(bCached, cachedUrl) {
      if (!bCached) {
        $id('pic-content').setAttribute('src', '');
        new AlertDialog('Cache picture failed');
        return;
      }
      $id('pic-content').setAttribute('src', cachedUrl);;
    });
  },

  _addListeners: function() {
    var closeBtn = $expr('.closeX', this._modalElement)[0];
    closeBtn.hidden = false;
    closeBtn.addEventListener('click', this.close.bind(this));
    $id('gallery-left-arrow').addEventListener('click', this._showPreviousPic.bind(this));
    $id('gallery-right-arrow').addEventListener('click', this._showNextPic.bind(this));
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('ImageViewer:show', this._onModalDialogShown);
    this.options.onclose();
  }
};

function WifiModePromptDialog(options) {
  this.initialize(options);
}

WifiModePromptDialog.prototype = {
  initialize: function(options) {
    this.options = extend({
      onclose: emptyFunction,
      title_l10n_id: '',
      prompt_l10n_id: ''
    }, options);

    this._modalElement = null;
    this._mask = null;
    this._build();
  },

  closeAll: function() {
    var evt = document.createEvent('Event');
    evt.initEvent('WifiModePromptDialog:show', true, true);
    document.dispatchEvent(evt);
  },

  _build: function() {
    this._mask = document.createElement('div');
    this._mask.className = 'modal-mask';
    document.body.appendChild(this._mask);

    this._modalElement = document.createElement('div');
    this._modalElement.className = 'modal-dialog';
    var templateData = {
      title_l10n_id: '',
      prompt_l10n_id: ''
    };
    if (this.options.title_l10n_id != '') {
      templateData.title_l10n_id = this.options.title_l10n_id;
    }
    if (this.options.prompt_l10n_id != '') {
      templateData.prompt_l10n_id = this.options.prompt_l10n_id;
    }
    this._modalElement.innerHTML = tmpl('tmpl_wifiMode_dialog', templateData);
    document.body.appendChild(this._modalElement);
    this._adjustModalPosition();
    this._makeDialogCancelable();

    // Translate l10n value
    navigator.mozL10n.translate(this._modalElement);

    // Only one modal dialog is shown at a time.
    var self = this;
    this._onModalDialogShown = function(event) {
      // Show a popup dialog at a time.
      if (event.targetElement == self._modalElement) {
        return;
      }

      self.close();
    }
    document.addEventListener('WifiModePromptDialog:show', this._onModalDialogShown);

    // Make sure other modal dialog has a chance to close itself.
    this._fireEvent('WifiModePromptDialog:show');

    // Tweak modal dialog position when resizing.
    this._onWindowResize = function(event) {
      self._adjustModalPosition();
    };
    window.addEventListener('resize', this._onWindowResize);
  },

  _makeDialogCancelable: function() {
    var closeBtn = $expr('.select-multi-files-dialog-header-x', this._modalElement)[0];
    closeBtn.hidden = false;
    closeBtn.addEventListener('click', this.close.bind(this));

    var cancelBtn = $expr('.button-cancel', this._modalElement)[0];
    cancelBtn.hidden = false;
    cancelBtn.addEventListener('click', this.close.bind(this));

    var self = this;
  },

  _adjustModalPosition: function() {
    var container = $expr('.modal-container', this._modalElement)[0];
    var documentHeight = document.documentElement.clientHeight;
    var containerHeight = container.clientHeight;
    container.style.top = (documentHeight > containerHeight ? (documentHeight - containerHeight) / 2 : 0) + 'px';
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('WifiModePromptDialog:show', this._onModalDialogShown);
    window.removeEventListener('resize', this._onWindowResize)
    this.options.onclose();
  }
};

var animationLoadingDialog = function() {
  this.groupId = 0;
  this.startNum = 0;
  this._modalElement = document.createElement('div');
  this._modalElement.className = 'loading-dialog';
  var templateData = {};
  this._modalElement.innerHTML = tmpl('tmpl_loading_dialog', templateData);
};

animationLoadingDialog.prototype = {
  start: function() {
    this.startNum++;
    if (this.startNum > 1) {
      return this.groupId;
    }
    var containerHeight = $id('container').clientHeight;
    var documentHeight = document.documentElement.clientHeight;
    var loading = $expr('.loading', this._modalElement)[0];
    document.body.appendChild(this._modalElement);
    loading.style.top = (documentHeight > containerHeight ? (containerHeight - loading.clientHeight) / 2 : (documentHeight - loading.clientHeight) / 2) + 'px';
    return this.groupId;
  },

  stop: function(groupId) {
    if ((this.startNum <= 0) || (groupId != this.groupId)) {
      return;
    }
    this.startNum--;
    if (this.startNum == 0) {
      this._modalElement.parentNode.removeChild(this._modalElement);
    }
  },

  reset: function() {
    if (this.startNum > 0) {
      this.startNum = 0;
      this.groupId++;
      this._modalElement.parentNode.removeChild(this._modalElement);
    }
  },
};

function AlertDialog(message, showCancelButton, callback) {
  this.initialize(message, showCancelButton, callback);
}

AlertDialog.prototype = {
  initialize: function(message, showCancelButton, callback) {
    this._modalElement = null;
    this._mask = null;
    this._mask = document.createElement('div');
    this._mask.className = 'modal-mask';
    document.body.appendChild(this._mask);
    this._modalElement = document.createElement('div');
    this._modalElement.className = 'modal-dialog';
    this.callback = callback;
    this.showCancelButton = showCancelButton;
    var templateData = {
      message: message
    };
    this._modalElement.innerHTML = tmpl('tmpl_alert_dialog', templateData);
    document.body.appendChild(this._modalElement);
    this._adjustModalPosition();
    this._makeDialogCancelable();
    // Translate l10n value
    navigator.mozL10n.translate(this._modalElement);
    // Only one modal dialog is shown at a time.
    var self = this;
    this._onModalDialogShown = function(event) {
      // Show a popup dialog at a time.
      if (event.targetElement == self._modalElement) {
        return;
      }

      self.close();
    }
    document.addEventListener('AlertDialog:show', this._onModalDialogShown);
    // Make sure other modal dialog has a chance to close itself.
    this._fireEvent('AlertDialog:show');
    // Tweak modal dialog position when resizing.
    this._onWindowResize = function(event) {
      self._adjustModalPosition();
    };
    window.addEventListener('resize', this._onWindowResize);
  },

  _makeDialogCancelable: function() {
    var okBtn = $expr('.button-ok', this._modalElement)[0];
    okBtn.addEventListener('click', this.okButtonCallback.bind(this));

    var cancelBtn = $expr('.button-cancel', this._modalElement)[0];
    cancelBtn.hidden = !this.showCancelButton;
    cancelBtn.addEventListener('click', this.cancelButtonCallback.bind(this));

    var closeBtn = $expr('.alert-dialog-header-x', this._modalElement)[0];
    closeBtn.addEventListener('click', this.cancelButtonCallback.bind(this));
  },

  _adjustModalPosition: function() {
    var containerHeight = $id('container').clientHeight;
    var documentHeight = document.documentElement.clientHeight;
    var alertDialog = $expr('.alert', this._modalElement)[0];
    alertDialog.style.top = (documentHeight > containerHeight ? (containerHeight - alertDialog.clientHeight) / 2 : (documentHeight - alertDialog.clientHeight) / 2) + 'px';
  },

  _fireEvent: function(name, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(name, true, true);
    evt.data = data;
    evt.targetElement = this._modalElement;
    document.dispatchEvent(evt);
  },

  okButtonCallback: function() {
    this.close();
    if (this.callback) {
      this.callback();
    }
  },

  cancelButtonCallback: function() {
    this.close();
  },

  close: function() {
    this._mask.parentNode.removeChild(this._mask);
    this._modalElement.parentNode.removeChild(this._modalElement);
    this._mask = null;
    this._modalElement = null;
    document.removeEventListener('AlertDialog:show', this._onModalDialogShown);
    window.removeEventListener('resize', this._onWindowResize)
  }
};

function Tip(options) {
  this.initialize(options);
}

Tip.prototype = {
  initialize: function(options) {
    this.options = extend({
      element: null,
      innerHTML: '',
      container: null
    }, options);
    if (!this.options.element || !this.options.container) {
      return;
    }

    var self = this;
    var tip = $id('tip');
    this.options.element.onmouseover = function(e) {
      tip.innerHTML = self.options.innerHTML;
      navigator.mozL10n.translate(tip);
      tip.style.top = (e.target.parentNode.offsetTop + e.target.parentNode.offsetParent.offsetTop + e.target.parentNode.clientHeight - self.options.container.scrollTop) + 'px';
      tip.style.left = (e.target.parentNode.offsetParent.offsetLeft + e.target.parentNode.offsetLeft + e.target.parentNode.clientWidth / 2) + 'px';
      tip.hidden = false;
    };
    this.options.element.onmouseout = function() {
      tip.hidden = true;
    };
  }
};
