/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2025 Andrei Danilin RUS Andrei Danilin. All rights reserved
 */

/**
 * Initialization Code and shared classes of library custom.pdf
 */
sap.ui.define(['jquery.sap.global', 'sap/ui/dom/includeScript'], function(global, includeScript) {
  'use strict';

  /**
   * A library containing mobile controls
   *
   * @namespace
   * @name custom.pdf
   * @public
   */

  // delegate further initialization of this library to the Core
  sap.ui.getCore().initLibrary({
    name: 'custom.pdf',
    dependencies: ['sap.ui.core', 'sap.m'],
    types: [],
    interfaces: [],
    controls: [
      'custom.pdf.PDFViewer'
    ],
    elements: [],
    noLibraryCSS: true,
    version: '1.0.0',
  });
  /* eslint-disable */
  custom.pdf.init = function() {
    custom.pdf.loaded =
      custom.pdf.loaded ||
      new Promise(function(resolve, reject) {
        if (custom.pdf.loaded) {
          resolve(custom.pdf.loaded);
        } else {
          includeScript(
              sap.ui.require.toUrl("custom/pdf") + '/libs/pdf.mjs',
              { type: 'module', id: 'pdfScriptId'},
              resolve,
              reject
          );
        }
      });
    custom.pdf.loaded
      .then(function() {
        custom.pdf.pdfLib = window.pdfjsLib;
        custom.pdf.pdfLib.GlobalWorkerOptions.workerSrc = sap.ui.require.toUrl("custom/pdf") + "/libs/pdf.worker.mjs";
      })
      .catch(function(error) {
        jQuery.sap.log.error('Error by get PDF library');
        jQuery.sap.log.error(error);
      });
    return custom.pdf.loaded;
  }; 

  // just because of old devices can use old version of browser
  if(!URL.parse) {
    URL.parse = function(urlString) {
      try {
        return  new URL(urlString, window.location);
      } catch(e) {
        return  null;
      }
    }
  };
  
  return custom.pdf;
  /* eslint-enable */
});
