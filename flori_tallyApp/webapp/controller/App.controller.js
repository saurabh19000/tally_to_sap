sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], function (Controller, UIComponent) {
    "use strict";

    return Controller.extend("app.tallyapp.controller.App", {

        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.attachRouteMatched(function (oEvent) {
                var sRouteName = oEvent.getParameter("name");
                var sToken = localStorage.getItem("tallyAuthToken");

                if ((sRouteName === "RouteView1" || sRouteName === "Credentials") && !sToken) {
                    oRouter.navTo("Login", {}, true);
                }
            });

            window.addEventListener("pageshow", function (oEvent) {
                if (oEvent.persisted) {
                    var sHash = window.location.hash;
                    var sToken = localStorage.getItem("tallyAuthToken");
                    if (!sToken && (sHash === "#/dashboard" || sHash === "#/credentials")) {
                        window.location.hash = "";
                    }
                }
            });
        }

    });
});
