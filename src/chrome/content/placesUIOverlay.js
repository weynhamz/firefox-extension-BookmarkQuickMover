if ("undefined" == typeof(BookmarkQuickMover)) {
  var BookmarkQuickMover = {
    _stringBundle: null,

    get stringBundle() {
      if (!this._stringBundle)
        this._stringBundle = document.getElementById("BookmarkQuickMover-string-bundle");

      return this._stringBundle;
    },
  };
};

BookmarkQuickMover.placesUIOverlay = {
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
    var targetItemId = PlacesUtils.getConcreteItemId(aEvent.target._placesNode);

    var transactions = [];
    for (var i=0; i < targetNodes.length; i++) {
      // Nothing to do if the node is already under the selected folder
      if (targetNodes[i].parent.itemId == targetItemId)
        continue;

      let txn = new PlacesMoveItemTransaction(
        targetNodes[i].itemId,
        targetItemId,
        PlacesUtils.bookmarks.DEFAULT_INDEX
      );

      transactions.push(txn);
    }

    if (transactions.length != 0) {
      let txn = new PlacesAggregatedTransaction("Move Items", transactions);
      PlacesUtils.transactionManager.doTransaction(txn);
    }

    return false;
  },

  // Using our customized places menu view to show a popup
  // menu with only bookmark folders.
  popupshowing: function(aEvent) {
    if (!this.foldersMenu._placesView)
      new BookmarkQuickMover.PlacesFoldersMenu(aEvent, "place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder=" + PlacesUIUtils.allBookmarksFolderId);
  },
};

/**
 * In order to add an extra menuitem into each bookmark folder, we
 * need to have our own places menu view, which extend from the
 * builtin PlacesMenu view.
 **/
BookmarkQuickMover.PlacesFoldersMenu = function (aPopupShowingEvent, aPlace) {
  this._rootElt = aPopupShowingEvent.target;  // <menupopup>
  this._viewElt = this._rootElt.parentNode;   // parent <menu>
  this._viewElt._placesView = this;
  this._addEventListeners(this._rootElt, ["popupshowing", "popuphidden"], true);
  this._addEventListeners(window, ["unload"], false);

  PlacesViewBase.call(this, aPlace);
  this._onPopupShowing(aPopupShowingEvent);
};

BookmarkQuickMover.PlacesFoldersMenu.prototype = {
  // Extend from PlacesMenu.prototype
  __proto__: PlacesMenu.prototype,

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

    if (aPopup._placesNode.bookmarkIndex != -1
      && !aPopup._moveHereMenuitem) {
      // Add "Move Here" menuitem
      aPopup._moveHereMenuitem = document.createElement("menuitem");
      aPopup._moveHereMenuitem.setAttribute("label",
        BookmarkQuickMover.stringBundle.getString("BookmarkQuickMover.MoveHere.label"));
      aPopup._moveHereMenuitem._placesNode = aPopup._placesNode;
      aPopup.insertBefore(aPopup._moveHereMenuitem, aPopup._startMarker);

      // Add a menuseparater if there are other folders
      if (addSeparater) {
        aPopup._moveActionsMenuitemSeperator = document.createElement("menuseparator");
        aPopup.insertBefore(aPopup._moveActionsMenuitemSeperator, aPopup._startMarker);
      }
    }

    // Let the original _rebuildPopup method do the reset of work
    return PlacesMenu.prototype._rebuildPopup.apply(this, arguments);
  },
};

window.addEventListener('load', BookmarkQuickMover.placesUIOverlay, false);
