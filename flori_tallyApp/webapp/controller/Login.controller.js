sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, UIComponent, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("app.tallyapp.controller.Login", {

        onInit: function () {
            var that = this;
            var token = localStorage.getItem("tallyAuthToken");
            if (token) {
                fetch("/api/auth/verify-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.valid) {
                        MessageToast.show("Already logged in.");
                        fetch("/api/auth/credentials?token=" + encodeURIComponent(token))
                            .then(function (r) { return r.json(); })
                            .then(function (cData) {
                                if (cData.configured) {
                                    UIComponent.getRouterFor(that.getView()).navTo("RouteView1", {}, true);
                                } else {
                                    UIComponent.getRouterFor(that.getView()).navTo("Credentials", {}, true);
                                }
                            })
                            .catch(function () {
                                UIComponent.getRouterFor(that.getView()).navTo("Credentials", {}, true);
                            });
                    } else {
                        localStorage.removeItem("tallyAuthToken");
                    }
                })
                .catch(function () {
                    localStorage.removeItem("tallyAuthToken");
                });
            }
        },

        onEmailChange: function () {
            var email = this.byId("emailInput").getValue().trim();
            this._emailVerified = false;
            this.byId("passwordInput").setEnabled(false);
            this.byId("loginBtn").setEnabled(false);
            if (!email) {
                this._setEmailStatus("None", "");
                return;
            }
            if (!email.includes("@") || !email.toLowerCase().endsWith(".com")) {
                this._setEmailStatus("Error", "Invalid email format. Must contain '@' and end with '.com'.");
            } else {
                this._setEmailStatus("None", "");
            }
        },

        onVerifyEmail: function () {
            var email = this.byId("emailInput").getValue().trim();

            if (!email) {
                this._setEmailStatus("Error", "Please enter an email address.");
                return;
            }
            if (!email.includes("@") || !email.toLowerCase().endsWith(".com")) {
                this._setEmailStatus("Error", "Invalid email format. Must contain '@' and end with '.com'.");
                return;
            }

            var that = this;
            this._setBusy(true);
            this._setEmailStatus("None", "");

            fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                that._setBusy(false);
                if (data.success) {
                    that._emailVerified = true;
                    that._setEmailStatus("Success", "License verified: " + data.license.plan);
                    that.byId("passwordInput").setEnabled(true);
                    that.byId("passwordInput").focus();
                    MessageToast.show("Email verified! Enter your password.");
                } else {
                    that._emailVerified = false;
                    that._setEmailStatus("Error", data.message);
                }
            })
            .catch(function () {
                that._setBusy(false);
                that._emailVerified = false;
                that._setEmailStatus("Error", "Could not verify email. Check network connection.");
            });
        },

        onPasswordChange: function () {
            var password = this.byId("passwordInput").getValue();
            this.byId("loginBtn").setEnabled(password.length > 0 && this._emailVerified === true);
        },

        onLogin: function () {
            var email = this.byId("emailInput").getValue().trim();
            var password = this.byId("passwordInput").getValue();

            if (!email || !password) {
                MessageBox.error("Please enter email and password.");
                return;
            }

            if (!this._emailVerified) {
                this._setPasswordStatus("Error", "Please verify your email first.");
                return;
            }

            var that = this;
            this._setBusy(true);
            this._setPasswordStatus("None", "");

            fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                that._setBusy(false);
                if (data.success) {
                    localStorage.setItem("tallyAuthToken", data.token);
                    if (data.credentialsConfigured) {
                        MessageToast.show("Login successful! Stored credentials loaded.");
                        UIComponent.getRouterFor(that.getView()).navTo("RouteView1", {}, true);
                    } else {
                        MessageToast.show("Login successful! Please configure your BTP credentials.");
                        UIComponent.getRouterFor(that.getView()).navTo("Credentials", {}, true);
                    }
                } else {
                    that._setPasswordStatus("Error", data.message);
                }
            })
            .catch(function () {
                that._setBusy(false);
                that._setPasswordStatus("Error", "Login failed. Check network connection.");
            });
        },

        _setEmailStatus: function (state, text) {
            var oText = this.byId("emailStatusText");
            if (!text) {
                oText.setVisible(false);
                return;
            }
            oText.setText(text);
            oText.setVisible(true);
        },

        _setPasswordStatus: function (state, text) {
            var oText = this.byId("passwordStatusText");
            if (!text) {
                oText.setVisible(false);
                return;
            }
            oText.setText(text);
            oText.setVisible(true);
        },

        _setBusy: function (busy) {
            this.byId("loginBusy").setVisible(busy);
            this.byId("verifyEmailBtn").setEnabled(!busy);
            this.byId("loginBtn").setEnabled(!busy && this._emailVerified === true && this.byId("passwordInput").getValue().length > 0);
        }

    });
});
