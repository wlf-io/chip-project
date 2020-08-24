/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/common/interfaces/source.interfaces.ts":
/*!****************************************************!*\
  !*** ./src/common/interfaces/source.interfaces.ts ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.IsPin = exports.IsConnection = exports.IsChip = exports.IsChipContent = exports.IsChipData = exports.IsChipSource = void 0;\nexports.IsChipSource = (data) => {\n    if (!IsObj(data))\n        return false;\n    console.log(\"SOURCE\", \"IS OBJ\");\n    if (!HasPropThatPasses(data, \"chip\", exports.IsChip))\n        return false;\n    console.log(\"SOURCE\", \"HAS CHIP\");\n    if (!HasPropThatPasses(data, \"chipData\", IsObj))\n        return false;\n    console.log(\"SOURCE\", \"HAS CHIPDATA\");\n    for (const [name, cd] of Object.entries(data[\"chipData\"])) {\n        console.groupCollapsed(\"CHIPDATA: \" + name);\n        if (!exports.IsChipData(cd)) {\n            console.groupEnd();\n            return false;\n        }\n        console.groupEnd();\n    }\n    return true;\n};\nexports.IsChipData = (data) => {\n    if (!IsObj(data))\n        return false;\n    console.log(\"CHIP DATA\", \"IS OBJ\", data);\n    if (!HasArrayProps(data, [\"inputs\", \"outputs\", \"constants\"]))\n        return false;\n    console.log(\"CHIP DATA\", \"HAS INPUTS OUTPUTS CONSTANTS\");\n    if (!ArrayOfType(data[\"inputs\"], \"string\"))\n        return false;\n    console.log(\"CHIP DATA\", \"INPUTS IS STRING[]\");\n    if (!ArrayOfType(data[\"outputs\"], \"string\"))\n        return false;\n    console.log(\"CHIP DATA\", \"OUTPUTS IS STRING[]\");\n    if (!ArrayOfType(data[\"constants\"], \"string\"))\n        return false;\n    console.log(\"CHIP DATA\", \"CONSTANTS IS STRING[]\");\n    if (!HasPropThatPasses(data, \"content\", exports.IsChipContent))\n        return false;\n    console.log(\"CHIP DATA\", \"HAS CHIPCONTENT\");\n    return true;\n};\nexports.IsChipContent = (data) => {\n    if (!IsObj(data))\n        return false;\n    console.log(\"CHIP CONTENT\", \"IS OBJ\");\n    if (!HasArrayProps(data, [\"chips\", \"connections\"]))\n        return false;\n    console.log(\"CHIP CONTENT\", \"HAS CHIPS CONNECTIONS\");\n    if (!ArrayContentPasses(data[\"chips\"], exports.IsChip))\n        return false;\n    console.log(\"CHIPCONTENT\", \"CHIPS IS CHIP[]\");\n    if (!ArrayContentPasses(data[\"connections\"], exports.IsConnection))\n        return false;\n    console.log(\"CHIPCONTENT\", \"CONNECTIONS IS CONNECTION[]\");\n    return true;\n};\nexports.IsChip = (data) => {\n    if (!IsObj(data))\n        return false;\n    if (!HasPropOfType(data, \"id\", \"string\"))\n        return false;\n    if (!HasPropOfType(data, \"name\", \"string\"))\n        return false;\n    if (!HasPropOfType(data, \"type\", \"string\"))\n        return false;\n    if (!HasPropThatPasses(data, \"constants\", IsObj))\n        return false;\n    return true;\n};\nexports.IsConnection = (data) => {\n    if (!IsObj(data))\n        return false;\n    if (!HasPropThatPasses(data, \"source\", exports.IsPin))\n        return false;\n    if (!HasPropThatPasses(data, \"target\", exports.IsPin))\n        return false;\n    return true;\n};\nexports.IsPin = (data) => {\n    if (!IsObj(data))\n        return false;\n    if (!HasPropOfType(data, \"chip\", \"string\"))\n        return false;\n    if (!HasPropOfType(data, \"name\", \"string\"))\n        return false;\n    if (!HasPropOfType(data, \"output\", \"boolean\"))\n        return false;\n    return true;\n};\nconst HasArrayProps = (obj, props) => {\n    for (const prop of props) {\n        if (!HasArrayProp(obj, prop))\n            return false;\n    }\n    return true;\n};\nconst HasArrayProp = (obj, prop) => {\n    return IsObj(obj) && HasProp(obj, prop) && obj[prop] instanceof Array;\n};\nconst HasPropOfType = (obj, prop, type) => {\n    return IsObj(obj) && HasProp(obj, prop) && typeof obj[prop] == type;\n};\nconst ArrayContentPasses = (arr, func) => {\n    for (const item of arr) {\n        if (!func(item))\n            return false;\n    }\n    return true;\n};\nconst ArrayOfType = (arr, type) => {\n    for (const item of arr) {\n        if (typeof item !== type)\n            return false;\n    }\n    return true;\n};\nconst HasPropThatPasses = (obj, prop, func) => {\n    return IsObj(obj) && HasProp(obj, prop) && func(obj[prop]);\n};\nconst HasProp = (obj, prop) => {\n    return IsObj(obj) && obj.hasOwnProperty(prop);\n};\nconst IsObj = (obj) => {\n    if (obj) {\n        if (typeof obj !== \"object\")\n            return false;\n        if (obj instanceof Array)\n            return false;\n        return true;\n    }\n    return false;\n};\n\n\n//# sourceURL=webpack:///./src/common/interfaces/source.interfaces.ts?");

/***/ }),

/***/ "./src/compiler/Compiler.ts":
/*!**********************************!*\
  !*** ./src/compiler/Compiler.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst source_interfaces_1 = __webpack_require__(/*! ../common/interfaces/source.interfaces */ \"./src/common/interfaces/source.interfaces.ts\");\nclass Compiler {\n    constructor() {\n        this.source = null;\n    }\n    loadSource(source) {\n        this.source = null;\n        const json = typeof source == \"string\" ? JSON.parse(source) : source;\n        console.groupCollapsed(\"SOURCE TEST\");\n        if (source_interfaces_1.IsChipSource(json)) {\n            this.source = json;\n        }\n        console.groupEnd();\n        if (this.source == null)\n            throw \"NOT VALID CHIP SOURCE\";\n    }\n    run() {\n        console.log(this.source);\n    }\n}\nexports.default = Compiler;\n\n\n//# sourceURL=webpack:///./src/compiler/Compiler.ts?");

/***/ }),

/***/ "./src/compiler/index.ts":
/*!*******************************!*\
  !*** ./src/compiler/index.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst Compiler_1 = __importDefault(__webpack_require__(/*! ./Compiler */ \"./src/compiler/Compiler.ts\"));\nwindow.ChipCompiler = Compiler_1.default;\n\n\n//# sourceURL=webpack:///./src/compiler/index.ts?");

/***/ }),

/***/ 0:
/*!*************************************!*\
  !*** multi ./src/compiler/index.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("module.exports = __webpack_require__(/*! ./src/compiler/index.ts */\"./src/compiler/index.ts\");\n\n\n//# sourceURL=webpack:///multi_./src/compiler/index.ts?");

/***/ })

/******/ });