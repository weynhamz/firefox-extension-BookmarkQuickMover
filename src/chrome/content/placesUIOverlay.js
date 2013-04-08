if ("undefined" == typeof(BookmarkQuickMover)) {
  var BookmarkQuickMover = {
    _stringBundle: null,

    get stringBundle() {
      if (!this._stringBundle)
        this._stringBundle =
          document.getElementById("BookmarkQuickMover-string-bundle") ?
          document.getElementById("BookmarkQuickMover-string-bundle") :
          parent.document.getElementById("BookmarkQuickMover-string-bundle");

      return this._stringBundle;
    },
  };
};

BookmarkQuickMover.placesUIOverlay = {
  _placesView: null,

  get placesView() {
    return this._placesView;
  },

  _foldersMenu: null,

  get foldersMenu() {
    if (!this._foldersMenu)
      this._foldersMenu = document.getElementById("placesContext_BookmarkQuickMover");

    return this._foldersMenu;
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case 'load':
        this.init(aEvent);
        break;
      case 'unload':
        this.unload();
        break;
      case 'command':
        this.command(aEvent);
        break;
      case 'popupshowing':
        this.popupshowing(aEvent);
        break;
    }
  },

  init: function(aEvent) {
    window.removeEventListener('load', this, false);
    window.addEventListener('unload', this, false);
    this.foldersMenu.addEventListener('command', this, true);
    this.foldersMenu.addEventListener('popupshowing', this, true);
  },

  unload: function(aEvent){
    this.foldersMenu.removeEventListener('popupshowing', this, true);
    this.foldersMenu.removeEventListener('command', this, true);
    window.removeEventListener('unload', this, false);
  },

  command: function(aEvent) {
    // Do not respond to non-menuitem elements
    if (aEvent.target.nodeName != "menuitem") {
      return false;
    }

    var targetNodes = PlacesUIUtils.getViewForNode(document.popupNode).selectedNodes;
    var targetFolder = aEvent.target.parentNode;
    var targetFolderNode = targetFolder._placesNode;
    var targetFolderItemId = null;

    // Move to the target folder
    if (aEvent.target == aEvent.target.parentNode._moveToThisFolderMenuitem) {
      // The destination node has to be a bookmark folder
      if (targetFolderNode.type != Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER &&
          targetFolderNode.type != Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER_SHORTCUT) {
        return false;
      }
      targetFolderItemId = PlacesUtils.getConcreteItemId(targetFolderNode);
    }
    // Move to a new sub folder in the target folder
    else if (aEvent.target == aEvent.target.parentNode._moveToNewSubFolderMenuitem) {
      // Set the target folder node as insert point
      this._placesView.insertionPoint = targetFolderNode;
      // Okay, let's created the desired folder
      this.goDoCommand("placesCmd_new:folder");
      // Places controller will pass the item id of the newly
      // created node to the View's 'selectItems' method. In our
      // customized menu view, this method will store the given
      // items into a property called selectedItems.
      targetFolderItemId = this._placesView.selectedItems[0];
    }

    if (targetNodes && targetFolderItemId)
      this.movePlacesNodes(targetNodes,targetFolderItemId);

    return false;
  },

  // Using our customized places menu view to show a popup
  // menu with only bookmark folders.
  popupshowing: function(aEvent) {
    if (!this.foldersMenu._placesView) {
      new BookmarkQuickMover.PlacesFoldersMenu(aEvent, "place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder=" + PlacesUIUtils.allBookmarksFolderId);
      // We store this view for later use
      this._placesView = this.foldersMenu._placesView;
    }
  },

  goDoCommand: function(aCommand) {
    let controller = this._placesView.controllers.getControllerForCommand(aCommand);
    if (controller && controller.isCommandEnabled(aCommand)) {
      controller.doCommand(aCommand);
    }
  },

  movePlacesNodes: function(targetNodes, targetFolderItemId) {
    var transactions = [];
    for (var i=0; i < targetNodes.length; i++) {
      // Nothing to do if the node is already under the selected folder
      if (targetNodes[i].parent.itemId == targetFolderItemId)
        continue;

      let txn = new PlacesMoveItemTransaction(
        targetNodes[i].itemId,
        targetFolderItemId,
        PlacesUtils.bookmarks.DEFAULT_INDEX
      );

      transactions.push(txn);
    }

    if (transactions.length != 0) {
      let txn = new PlacesAggregatedTransaction("Move Items", transactions);
      PlacesUtils.transactionManager.doTransaction(txn);
    }
  },
};

/**
 * In order to add an extra menuitem into each bookmark folder, we
 * need to have our own places menu view, which extend from the
 * builtin PlacesMenu view.
 **/
BookmarkQuickMover.PlacesFoldersMenu = function (aPopupShowingEvent, aPlace) {
  PlacesMenu.apply(this,arguments);
};

BookmarkQuickMover.PlacesFoldersMenu.prototype = {
  // Extend from PlacesMenu.prototype
  __proto__: PlacesMenu.prototype,

  _selectedItems: null,

  /**
   * Getter method for 'selectedItems'
   **/
  get selectedItems() {
    return this._selectedItems;
  },

  _insertionPoint: null,

  /**
   * Getter method for 'insertionPoint'
   **/
  get insertionPoint() {
    return this._insertionPoint;
  },

  /**
   * We mannually set out 'insertionPoint' to make
   * sure the controller functionality depending on
   * this works.
   *
   * @param container
   *        a Places node where new node will
   *        be created into
   **/
  set insertionPoint(container) {
    let isTag = false;
    let index = PlacesUtils.bookmarks.DEFAULT_INDEX;
    let orientation = Ci.nsITreeView.DROP_BEFORE;
    this._insertionPoint = new InsertionPoint(
      PlacesUtils.getConcreteItemId(container),
      index,
      orientation,
      isTag
    );
  },

  /**
   * Some controller methods will call this method
   * with their result nodes, so we make sure we
   * can get them back later.
   *
   * @param items
   *        an array of Places nodes
   **/
  selectItems:
  function(items) {
    this._selectedItems = items;
  },

  /**
   * By overwriting the _rebuildPopup method, we
   * can add any menuitem into the popup menu.
   *
   * @param aPopup
   *        a Places popup menu.
   **/
  _rebuildPopup:
  function PVB__rebuildPopup(aPopup) {
    var addSeparater = aPopup._placesNode.childCount > 0 ? true : false;

    if (aPopup != this._rootElt   // The command items are never added to the root popup
      && !aPopup._moveToThisFolderMenuitem) {
      // Add "Move Here" menuitem
      aPopup._moveToThisFolderMenuitem = document.createElement("menuitem");
      aPopup._moveToThisFolderMenuitem.setAttribute("label",
        BookmarkQuickMover.stringBundle.getString("BookmarkQuickMover.MoveToThisFolder.label"));
      aPopup.insertBefore(aPopup._moveToThisFolderMenuitem, aPopup._startMarker);

      // Add "Move to New SubFolder" menuitem
      aPopup._moveToNewSubFolderMenuitem = document.createElement("menuitem");
      aPopup._moveToNewSubFolderMenuitem.setAttribute("label",
        BookmarkQuickMover.placesUIOverlay.stringBundle.getString(
          "BookmarkQuickMover.MoveToNewSubFolder.label"));
      aPopup.insertBefore(aPopup._moveToNewSubFolderMenuitem, aPopup._startMarker);

      // Add a menuseparater if there are other folders
      if (addSeparater) {
        aPopup._moveActionsMenuitemSeperator = document.createElement("menuseparator");
        aPopup.insertBefore(aPopup._moveActionsMenuitemSeperator, aPopup._startMarker);
      }
    }

    // Let the original _rebuildPopup method do the reset of work
    return PlacesMenu.prototype._rebuildPopup.apply(this, arguments);
  },

  /**
   * Prevent the original method from adding an "Open All in Tabs"
   * menuitem to the bottom of the popup.
   *
   * @param aPopup
   *        a Places popup.
   **/
  _mayAddCommandsItems:
  function PVB__mayAddCommandsItems(aPopup) {
    return false;
  },
};

window.addEventListener('load', BookmarkQuickMover.placesUIOverlay, false);
