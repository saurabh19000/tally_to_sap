sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, UIComponent, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("app.tallyapp.controller.Credentials", {

        onInit: function () {
            var token = localStorage.getItem("tallyAuthToken");
            if (!token) {
                UIComponent.getRouterFor(this).navTo("Login", {}, true);
                return;
            }
            this._updateSaveButton();
            var that = this;
            fetch("/api/auth/credentials?token=" + encodeURIComponent(token))
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.configured) {
                        that.byId("clientIdInput").setValue(data.clientId || "");
                        that.byId("clientSecretInput").setValue(data.clientSecret || "");
                        that.byId("tokenUrlInput").setValue(data.tokenUrl || "");
                        that.byId("cpiBaseInput").setValue(data.cpiApiBase || "");
                        that.byId("saveCredsBtn").setText("Update & Continue to Dashboard");
                        MessageToast.show("Stored credentials loaded. You can update them below.");
                    }
                    that._updateSaveButton();
                })
                .catch(function () { that._updateSaveButton(); });
        },

        onInputChange: function () {
            this._updateSaveButton();
        },

        onUploadFile: function () {
            var that = this;
            var input = document.createElement("input");
            input.type = "file";
            input.accept = ".txt,.env,.json,.pem";
            input.onchange = function (e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function (evt) {
                    that._parseFile(evt.target.result);
                };
                reader.readAsText(file);
            };
            input.click();
        },

        _parseFile: function (content) {
            var creds = {};
            var lines = content.split("\n");
            var ctrl = this;

            lines.forEach(function (line) {
                var match = line.match(/^\s*(BTP_CLIENT_ID|BTP_CLIENT_SECRET|BTP_TOKEN_URL|BTP_CPI_API_BASE|BTP_RUNTIME_URL|BTP_CPI_BASE_URL|BTP_RUNTIME)\s*=\s*(.+)\s*$/);
                if (match) {
                    var val = match[2].replace(/^["']|["']$/g, "").trim();
                    if (match[1] === "BTP_CLIENT_ID") creds.clientId = val;
                    else if (match[1] === "BTP_CLIENT_SECRET") creds.clientSecret = val;
                    else if (match[1] === "BTP_TOKEN_URL") creds.tokenUrl = val;
                    else if (match[1] === "BTP_CPI_API_BASE" || match[1] === "BTP_RUNTIME_URL" || match[1] === "BTP_CPI_BASE_URL" || match[1] === "BTP_RUNTIME") creds.cpiApiBase = val;
                }
            });

            try {
                var json = JSON.parse(content);
                if (json.clientid || json.clientId) creds.clientId = json.clientid || json.clientId;
                if (json.clientsecret || json.clientSecret) creds.clientSecret = json.clientsecret || json.clientSecret;
                if (json.url || json.tokenUrl || json.tokenurl) creds.tokenUrl = json.url || json.tokenUrl || json.tokenurl;
                if (json.cpiApiBase || json.endpoint || json.cpi_api_base) creds.cpiApiBase = json.cpiApiBase || json.endpoint || json.cpi_api_base;
            } catch (e) {}

            if (creds.clientId) ctrl.byId("clientIdInput").setValue(creds.clientId);
            if (creds.clientSecret) ctrl.byId("clientSecretInput").setValue(creds.clientSecret);
            if (creds.tokenUrl) ctrl.byId("tokenUrlInput").setValue(creds.tokenUrl);
            if (creds.cpiApiBase) ctrl.byId("cpiBaseInput").setValue(creds.cpiApiBase);

            ctrl._updateSaveButton();

            var filled = Object.keys(creds).length;
            if (filled === 4) {
                MessageToast.show("All 4 credentials loaded from file.");
            } else if (filled > 0) {
                MessageToast.show(filled + " of 4 credentials loaded from file.");
            } else {
                MessageBox.error("No recognized credentials found in file. Expected: BTP_CLIENT_ID, BTP_CLIENT_SECRET, BTP_TOKEN_URL, BTP_CPI_API_BASE or BTP_RUNTIME_URL");
            }
        },

        onSaveCredentials: function () {
            var token = localStorage.getItem("tallyAuthToken");
            if (!token) {
                MessageBox.error("Session expired. Please login again.");
                UIComponent.getRouterFor(this).navTo("Login", {}, true);
                return;
            }

            var clientId = this.byId("clientIdInput").getValue().trim();
            var clientSecret = this.byId("clientSecretInput").getValue().trim();
            var tokenUrl = this.byId("tokenUrlInput").getValue().trim();
            var cpiApiBase = this.byId("cpiBaseInput").getValue().trim();

            if (!clientId || !clientSecret || !tokenUrl || !cpiApiBase) {
                MessageBox.error("All four fields are required.");
                return;
            }

            var that = this;
            this._setBusy(true);
            this._setStatus("None", "");

            fetch("/api/auth/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, clientId, clientSecret, tokenUrl, cpiApiBase })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                that._setBusy(false);
                if (data.success) {
                    var dbMsg = data.dbPersisted ? "Saved to database." : "Saved in memory only (DB unavailable).";
                    MessageBox.success("Credentials saved successfully!\n\n" + dbMsg + "\n\nRedirecting to dashboard...", {
                        onClose: function () {
                            UIComponent.getRouterFor(that.getView()).navTo("RouteView1", {}, true);
                        }
                    });
                } else {
                    that._setStatus("Error", data.message);
                }
            })
            .catch(function () {
                that._setBusy(false);
                that._setStatus("Error", "Failed to save credentials. Check network.");
            });
        },

        onTogglePassword: function () {
            var oInput = this.byId("clientSecretInput");
            var oBtn = this.byId("pwdToggleBtn");
            if (oInput.getType() === "Password") {
                oInput.setType("Text");
                oBtn.setIcon("sap-icon://hide");
                oBtn.setTooltip("Hide password");
            } else {
                oInput.setType("Password");
                oBtn.setIcon("sap-icon://show");
                oBtn.setTooltip("Show password");
            }
        },

        _updateSaveButton: function () {
            var clientId = this.byId("clientIdInput").getValue().trim();
            var clientSecret = this.byId("clientSecretInput").getValue().trim();
            var tokenUrl = this.byId("tokenUrlInput").getValue().trim();
            var cpiApiBase = this.byId("cpiBaseInput").getValue().trim();
            this.byId("saveCredsBtn").setEnabled(!!(clientId && clientSecret && tokenUrl && cpiApiBase));
        },

        _setBusy: function (busy) {
            this.byId("credsBusy").setVisible(busy);
            this.byId("saveCredsBtn").setEnabled(!busy);
            this.byId("uploadBtn").setEnabled(!busy);
        },

        _setStatus: function (state, text) {
            var oText = this.byId("credsStatusText");
            if (!text) {
                oText.setVisible(false);
                return;
            }
            oText.setText(text);
            oText.setVisible(true);
        }

    });
});
