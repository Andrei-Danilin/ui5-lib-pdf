sap.ui.define(['jquery.sap.global', 'sap/ui/core/Control', 'sap/m/MessageToast', 'sap/ui/layout/FixFlex',
  'sap/m/OverflowToolbar', 'sap/ui/core/HTML', 'sap/m/ScrollContainer', 'sap/m/FlexBox',
  "sap/ui/model/json/JSONModel", "sap/m/Text", "sap/m/ToolbarSpacer", "sap/m/PDFViewer",
  "sap/m/OverflowToolbarLayoutData", "sap/m/Label", "sap/ui/Device", "sap/ui/model/resource/ResourceModel",
  "sap/m/StepInput", "sap/m/OverflowToolbarButton"
], function(
  jQuery, Control, MessageToast, FixFlex, OverflowToolbar, HTML, ScrollContainer, FlexBox, JSONModel,
  Text, ToolbarSpacer, SAPPDFViewer, OverflowToolbarLayoutData, Label, Device, ResourceModel, StepInput, OverflowToolbarButton
) {
  'use strict';

  var oPdfViewer = Control.extend('custom.pdf.PDFViewer', {
    metadata: {
      properties: {
        url: {
          type: 'string',
          defaultValue: "",
        },
        width: {
            type: 'sap.ui.core.CSSSize',
            defaultValue: '100%',
          },
        height: {
            type: 'sap.ui.core.CSSSize',
            defaultValue: '100%',
        },
        zoom: {
          type: 'number',
          defaultValue: 1
        },
        // will render only custom viewer (standard PDFViewer not tested)
        forceMobile: {
          type: 'boolean',
          defaultValue: true
        }
      },
      aggregations: {
        // internal
        layout: {
          type: 'sap.ui.core.Control',
          multiple: false,
          singularName: 'layout'
        }
      },
      events: {
        // document loaded
        loaded: {},
      },
    },

    constructor: function() {
      sap.ui.core.Control.prototype.constructor.apply(this, arguments);
    },

    init: function() {
      this.bInit = true;
      this._device = new JSONModel(Device);
      Device.orientation.attachHandler(function(oEvent) {
        this._flexBox.setJustifyContent(oEvent.landscape ? "Center" : "Start");
      }.bind(this));
      custom.pdf.init().then(()=>{
        this.pdfLib = window.pdfjsLib;
      });

      this.oi18n = sap.ui.getCore().getLibraryResourceBundle('custom.pdf');
      this._viewerModel = new JSONModel({
          pdfDoc: null,
          currentPage: 1,
          maxPage: 1,
          zoom: 1,
          rotation: 0 // 0, 90, 180, 270
      });
      if(this._device.getProperty("/system/phone") || this.getForceMobile()) {
        this._layout = new FixFlex();
        this._layout.setModel(this._device, "device");
        this.setModel(new ResourceModel({ bundle: this.oi18n }), "i18n");
        this._layout.addStyleClass("sapUiSizeCompact");
        this._toolbar = new OverflowToolbar();
        this._toolbar.setModel(this._viewerModel, "internal");
        this._toolbar.addContent(new Text({ text: "{i18n>zoom}", textAlign: "End", width: "4.5rem" }));
        this._toolbar.addContent(new StepInput({
          value: "{internal>/zoom}", min: 0.1, max: 5.0, width: "80%",
          step: 0.1, textAlign: "Center", change: this.applyZoom.bind(this),
          displayValuePrecision: 1
        }));
        /*
        this._toolbar.addContent(new Text({ text: "{internal>/zoom}", textAlign: "End" }));
        this._toolbar.addContent(new Slider({
          enableTickmarks: false, min: 0.1, max: 4.0, step: 0.1, value: "{internal>/zoom}",
          change: this.applyZoom.bind(this), width: "90%"
        }));
        */
        this._toolbar.addContent(new ToolbarSpacer());
        this._toolbar.addContent(new OverflowToolbarButton({ text: "< {i18n>prev}", press: this.showPrevPage.bind(this), 
          layoutData: new OverflowToolbarLayoutData({ priority: "AlwaysOverflow" }) }));
        this._toolbar.addContent(new Label({ text: "{internal>/currentPage} {i18n>pageOf} {internal>/maxPage}", textAlign: "Center",
          layoutData: new OverflowToolbarLayoutData({ priority: "AlwaysOverflow" })}));
        this._toolbar.addContent(new OverflowToolbarButton({ text: "{i18n>next} >", press: this.showNextPage.bind(this), 
          layoutData: new OverflowToolbarLayoutData({ priority: "AlwaysOverflow" }) }));
        this._toolbar.addContent(new OverflowToolbarButton({ tooltip: "{i18n>rotate}", 
          press: this.rotate.bind(this), icon: "sap-icon://synchronize",
          layoutData: new OverflowToolbarLayoutData({ priority: "NeverOverflow" }), width: "2rem" }));

        this._canvas = new HTML({ content: '<canvas id="id_ilim_pdf_canvas" class="ilim__pdf__canvas__container" />' });
        this._flexBox = new FlexBox({ height: "100%", alignItems: "Center", justifyContent: "{= ${device>/orientation/portrait} ? 'Start' : 'Center' }",
          alignContent: "SpaceAround", fitContainer: true, width: "100%", displayInline: true
        });

        this._scrolContainer = new ScrollContainer({ vertical: true, height: "100%", width: "100%" });
        this._scrolContainer.addContent(this._flexBox);
        this._flexBox.addItem(this._canvas);
        this._layout.addFixContent(this._toolbar);
        this._layout.setFlexContent(this._scrolContainer);
      } else {
        this._layout = new SAPPDFViewer();
      }
      this.setLayout(this._layout);
    },

    rotate: function() {
      if (this._viewerModel.getProperty("/pdfDoc") === null) return;
      let rotateValue = this._viewerModel.getProperty("/rotation");
      switch (rotateValue) {
        case 0:
          rotateValue = 90;
          break;
        case 90:
          rotateValue = 180;
          break;
        case 180:
          rotateValue = 270;
          break;
        default:
          rotateValue = 0;
      }
      this._viewerModel.setProperty("/rotation", rotateValue);
      this.renderPage();
    },

    showPage: function(oEvent) {
      if (this._viewerModel.getProperty("/pdfDoc") === null) return;
      let page = oEvent.getParameter("value");

      this._viewerModel.setProperty("/currentPage", page);
      this.renderPage();
    },

    showPrevPage: function() {
      let currentPage = this._viewerModel.getProperty("/currentPage");
      if (this._viewerModel.getProperty("/pdfDoc") === null 
          || currentPage <= 1) return;
      currentPage--;
      this._viewerModel.setProperty("/currentPage", currentPage);
      this.renderPage();
    },

    showNextPage: function() {
      let currentPage = this._viewerModel.getProperty("/currentPage");
      if (this._viewerModel.getProperty("/pdfDoc") === null 
          || currentPage >= this._viewerModel.getProperty("/maxPage")) return;
      currentPage++;
      this._viewerModel.setProperty("/currentPage", currentPage);
      this.renderPage();
    },

    applyZoom: function(oEvent) {
      this.setNewZoom(oEvent.getParameter("value"));
    },

    setNewZoom: function(newZoom, preventRender) {
      if (this._viewerModel.getProperty("/pdfDoc") === null) return;
      if(newZoom > 5) {
        newZoom = 5;
      }
      this._viewerModel.setProperty("/zoom", newZoom.toFixed(1));
      if(!preventRender) {
      	this.renderPage();
      }
    },

    onZoomIn: function() {
      if (this._viewerModel.getProperty("/pdfDoc") === null) return;
      let zoom = this._viewerModel.getProperty("/zoom");
      zoom *= 4 / 3;
      this._viewerModel.setProperty("/zoom", zoom.toFixed(1));
      this.renderPage();
    },

    onZoomOut: function() {
      if (this._viewerModel.getProperty("/pdfDoc") === null) return;
      let zoom = this._viewerModel.getProperty("/zoom");
      zoom *= 2 / 3;
      this._viewerModel.setProperty("/zoom", zoom.toFixed(1));
      this.renderPage();
    },

    renderPage: function() {
      if(this._device.getProperty("/system/phone") || this.getForceMobile()) {
        if (this._viewerModel.getProperty("/pdfDoc") === null) return;
        this._viewerModel.getProperty("/pdfDoc").getPage(this._viewerModel.getProperty("/currentPage")).then((page) => {
          const canvas = document.querySelector("#id_ilim_pdf_canvas");
          if(canvas){
            const ctx = canvas.getContext("2d");
            const viewport = page.getViewport({ scale: this._viewerModel.getProperty("/zoom"), 
              rotation: this._viewerModel.getProperty("/rotation")
            });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const renderCtx = {
              canvasContext: ctx,
              viewport: viewport,
            };
            if(this.currentRenderTask) {
            	this.currentRenderTask.promise.then(()=>{
            		this.currentRenderTask = page.render(renderCtx);
            	}).catch(() => {
            		console.log("Error by rendering pdf - try to rerender");
            		this.currentRenderTask = page.render(renderCtx);
            	})
            } else {
            	this.currentRenderTask = page.render(renderCtx);
            }
          }
        });
      }
    },
    
    renderer: function(oRm, oControl) {
        if(oControl._device.getProperty("/system/phone") || oControl.getForceMobile()) {
          oRm.write(
            '<div style="width:' + oControl.getWidth() + ';height: ' + oControl.getHeight() + '"'
          );
          oRm.writeControlData(oControl);
          oRm.writeClasses();
          oRm.write('>');
          oRm.renderControl(oControl.getLayout());
          oRm.write('</div>');
        } else {
          oRm.renderControl(oControl.getLayout());
        }
     },
    getDistance: function(touch1, touch2) {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },
     onAfterRendering: function() {
      const canvas = document.querySelector("#id_ilim_pdf_canvas");
      if(this.bInit) {
        this.bInit = false;
        this.initialDistance = null;
        canvas.addEventListener('touchstart', (e) => {
          if (e.touches.length === 2) {
            this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            this.initialZoom = parseFloat(this._viewerModel.getProperty("/zoom"));
          }
        });
        canvas.addEventListener('touchmove', (e) => {
          if (e.touches.length === 2 && this.initialDistance !== null) {
            e.preventDefault(); // Prevent scrolling/zooming

            const newDistance = this.getDistance(e.touches[0], e.touches[1]);
            let scale = newDistance / this.initialDistance;
            scale = scale.toFixed(2);
            console.log("scale: " + scale);
            let zoom = this.initialZoom * scale;
            zoom = this.initialZoom > 5 ? 5 : zoom;
			console.log("new zoom: " + zoom);
            this.setNewZoom(zoom, true);
          }
        }, { passive: false });
		canvas.addEventListener('touchend', (e) => {
		  if (e.touches.length < 2) {
		    this.initialDistance = null;
		    this.initialZoom = 1;
		    this.setNewZoom(parseFloat(this._viewerModel.getProperty("/zoom")));
		  }
		});
      }
     }
  });

  oPdfViewer.prototype.setUrl = function(sUrl) {
    this.setProperty('url', sUrl);
    if(!sUrl) return;
    
    if (this._device.getProperty("/system/phone") || this.getForceMobile()) {
      let oPromise = Promise.resolve();
      if(!this.pdfLib) {
        oPromise = custom.pdf.loaded;
      }
      oPromise.then(()=>{
        this.pdfLib.getDocument(sUrl).promise.then((data) => {
          this.fireLoaded();
          this._viewerModel.setProperty("/pdfDoc", data);
          this._viewerModel.setProperty("/maxPage", data.numPages);
          this.renderPage();
        })
        .catch((error) => {
          MessageToast.show(error.message);
          jQuery.sap.log.error(error);
        });
      });
    } else {
      this._layout.setSource(sUrl);
    }
  };

  oPdfViewer.prototype.getUrl = function() {      
      if (this._device.getProperty("/system/phone") || this.getForceMobile()) {
        return this.getProperty('url');
      } else {
        return this._layout.getSource();
      }
  };
  oPdfViewer.prototype.setZoom = function(nZoom) {
    this._viewerModel.setProperty("/zoom", nZoom);
    this.renderPage();
    this.setProperty('zoom', nZoom);
  };

  oPdfViewer.prototype.exit = function() {
    // delete some data ???
  };

  return oPdfViewer;
});
