# The zip application to be used.
ZIP := zip

# The temporary location where the extension tree will be copied and built.
build_dir := build

# The name of the extension.
extension_name := BookmarkQuickMover

# The UUID of the extension.
extension_uuid := BookmarkQuickMover@techlivezheng

# The sources for the XPI file.
extension_source := src/install.rdf \
             src/chrome.manifest \
             $(wildcard src/chrome/content/*.js) \
             $(wildcard src/chrome/content/*.xul) \
             $(wildcard src/chrome/content/*.xml) \
             $(wildcard src/chrome/content/*.css) \
             $(wildcard src/chrome/skin/*.css) \
             $(wildcard src/chrome/skin/*.png) \
             $(wildcard src/chrome/locale/*/*.dtd) \
             $(wildcard src/chrome/locale/*/*.properties)

# The contents of the XPI file.
extension_xpi_files := $(subst src/,,$(extension_source))

# The built contents of the XPI file.
extension_xpi_built := $(subst src/,$(build_dir)/,$(extension_source))

# The final built result of the XPI file.
extension_xpi_result := $(extension_name).xpi

# This builds the extension XPI file.
.PHONY: all
all: $(extension_xpi_result)
	@echo
	@echo "Build finished successfully."
	@echo

# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -f $(extension_xpi_result)
	@rm -rf $(build_dir)
	@echo "Cleanup is done."

$(build_dir):
	@if [ ! -x $(build_dir) ]; \
	then \
		mkdir $(build_dir); \
	fi

$(build_dir)/%: src/%
	@install -D $< $@

$(extension_xpi_result): $(build_dir) $(extension_xpi_built)
	@echo "Creating XPI file."
	@cd $(build_dir); $(ZIP) ../$(extension_xpi_result) $(extension_xpi_files)
	@echo "Creating XPI file. Done!"

# Read Makefile.install.in to generate a Makefile.install file
# which allows you to directly install the extension into your
# firefox profile directory.
-include Makefile.install

#vim: ft=makefile
