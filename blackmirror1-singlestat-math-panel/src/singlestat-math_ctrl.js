"use strict";
///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var lodash_1 = require("lodash");
var jquery_1 = require("jquery");
require("jquery.flot");
require("./lib/flot/jquery.flot.gauge");
require("jquery.flot.time");
require("jquery.flot.crosshair");
require("./css/panel_singlestatmath.css!");
var math_1 = require("./lib/mathjs/math");
var kbn_1 = require("app/core/utils/kbn");
var config_1 = require("app/core/config");
var time_series2_1 = require("app/core/time_series2");
var sdk_1 = require("app/plugins/sdk");
var SingleStatMathCtrl = /** @class */ (function (_super) {
    __extends(SingleStatMathCtrl, _super);
    /** @ngInject */
    function SingleStatMathCtrl($scope, $injector, $location, linkSrv) {
        var _this = _super.call(this, $scope, $injector) || this;
        _this.$location = $location;
        _this.linkSrv = linkSrv;
        _this.dataType = 'timeseries';
        _this.valueNameOptions = [
            { value: 'min', text: 'Min' },
            { value: 'max', text: 'Max' },
            { value: 'avg', text: 'Average' },
            { value: 'current', text: 'Current' },
            { value: 'total', text: 'Total' },
            { value: 'name', text: 'Name' },
            { value: 'first', text: 'First' },
            { value: 'delta', text: 'Delta' },
            { value: 'diff', text: 'Difference' },
            { value: 'range', text: 'Range' },
            { value: 'last_time', text: 'Time of last point' },
        ];
        // Set and populate defaults
        _this.panelDefaults = {
            links: [],
            datasource: null,
            maxDataPoints: 100,
            interval: null,
            targets: [{}],
            cacheTimeout: null,
            format: 'none',
            prefix: '',
            postfix: '',
            nullText: null,
            valueMaps: [{ value: 'null', op: '=', text: 'N/A' }],
            mappingTypes: [{ name: 'value to text', value: 1 }, { name: 'range to text', value: 2 }],
            rangeMaps: [{ from: 'null', to: 'null', text: 'N/A' }],
            mappingType: 1,
            nullPointMode: 'connected',
            valueName: 'avg',
            prefixFontSize: '50%',
            valueFontSize: '80%',
            postfixFontSize: '50%',
            thresholds: '',
            math: '',
            colorBackground: false,
            valueMappingColorBackground: '#787879',
            circleBackground: false,
            colorValue: false,
            colors: ['#299c46', 'rgba(237, 129, 40, 0.89)', '#d44a3a'],
            sparkline: {
                show: false,
                full: false,
                lineColor: 'rgb(31, 120, 193)',
                fillColor: 'rgba(31, 118, 189, 0.18)'
            },
            gauge: {
                show: false,
                minValue: 0,
                maxValue: 100,
                thresholdMarkers: true,
                thresholdLabels: false
            },
            tableColumn: ''
        };
        lodash_1["default"].defaults(_this.panel, _this.panelDefaults);
        _this.events.on('data-received', _this.onDataReceived.bind(_this));
        _this.events.on('data-error', _this.onDataError.bind(_this));
        _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
        _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
        _this.onSparklineColorChange = _this.onSparklineColorChange.bind(_this);
        _this.onSparklineFillChange = _this.onSparklineFillChange.bind(_this);
        return _this;
    }
    SingleStatMathCtrl.prototype.onInitEditMode = function () {
        this.fontSizes = ['20%', '30%', '50%', '70%', '80%', '100%', '110%', '120%', '150%', '170%', '200%'];
        this.addEditorTab('Options', 'public/plugins/blackmirror1-singlestat-math-panel/editor.html', 2);
        this.addEditorTab('Value Mappings', 'public/plugins/blackmirror1-singlestat-math-panel/mappings.html', 3);
        this.unitFormats = kbn_1["default"].getUnitFormats();
    };
    SingleStatMathCtrl.prototype.setUnitFormat = function (subItem) {
        this.panel.format = subItem.value;
        this.refresh();
    };
    SingleStatMathCtrl.prototype.onDataError = function (err) {
        this.onDataReceived([]);
    };
    SingleStatMathCtrl.prototype.onDataReceived = function (dataList) {
        var data = {};
        if (dataList.length > 0 && dataList[0].type === 'table') {
            this.dataType = 'table';
            var tableData = dataList.map(this.tableHandler.bind(this));
            this.setTableValues(tableData, data);
        }
        else {
            this.dataType = 'timeseries';
            this.series = dataList.map(this.seriesHandler.bind(this));
            this.setValues(data);
        }
        this.data = data;
        this.render();
    };
    SingleStatMathCtrl.prototype.seriesHandler = function (seriesData) {
        var series = new time_series2_1["default"]({
            datapoints: seriesData.datapoints || [],
            alias: seriesData.target
        });
        series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
        return series;
    };
    SingleStatMathCtrl.prototype.tableHandler = function (tableData) {
        var datapoints = [];
        var columnNames = {};
        tableData.columns.forEach(function (column, columnIndex) {
            columnNames[columnIndex] = column.text;
        });
        this.tableColumnOptions = columnNames;
        if (!lodash_1["default"].find(tableData.columns, ['text', this.panel.tableColumn])) {
            this.setTableColumnToSensibleDefault(tableData);
        }
        tableData.rows.forEach(function (row) {
            var datapoint = {};
            row.forEach(function (value, columnIndex) {
                var key = columnNames[columnIndex];
                datapoint[key] = value;
            });
            datapoints.push(datapoint);
        });
        return datapoints;
    };
    SingleStatMathCtrl.prototype.setTableColumnToSensibleDefault = function (tableData) {
        if (tableData.columns.length === 1) {
            this.panel.tableColumn = tableData.columns[0].text;
        }
        else {
            this.panel.tableColumn = lodash_1["default"].find(tableData.columns, function (col) {
                return col.type !== 'time';
            }).text;
        }
    };
    SingleStatMathCtrl.prototype.setTableValues = function (tableData, data) {
        if (!tableData || tableData.length === 0) {
            return;
        }
        if (tableData[0].length === 0 || tableData[0][0][this.panel.tableColumn] === undefined) {
            return;
        }
        var datapoint = tableData[0][0];
        data.value = datapoint[this.panel.tableColumn];
        if (lodash_1["default"].isString(data.value)) {
            data.valueFormatted = lodash_1["default"].escape(data.value);
            data.value = 0;
            data.valueRounded = 0;
        }
        else {
            var decimalInfo = this.getDecimalsForValue(data.value);
            var formatFunc = kbn_1["default"].valueFormats[this.panel.format];
            data.valueFormatted = formatFunc(datapoint[this.panel.tableColumn], decimalInfo.decimals, decimalInfo.scaledDecimals);
            data.valueRounded = kbn_1["default"].roundValue(data.value, this.panel.decimals || 0);
        }
        this.setValueMapping(data);
    };
    SingleStatMathCtrl.prototype.canChangeFontSize = function () {
        return this.panel.gauge.show;
    };
    SingleStatMathCtrl.prototype.setColoring = function (options) {
        if (options.background) {
            this.panel.colorValue = false;
            this.panel.colors = ['rgba(71, 212, 59, 0.4)', 'rgba(245, 150, 40, 0.73)', 'rgba(225, 40, 40, 0.59)'];
        }
        else {
            this.panel.colorBackground = false;
            this.panel.colors = ['rgba(50, 172, 45, 0.97)', 'rgba(237, 129, 40, 0.89)', 'rgba(245, 54, 54, 0.9)'];
        }
        this.render();
    };
    SingleStatMathCtrl.prototype.invertColorOrder = function () {
        var tmp = this.panel.colors[0];
        this.panel.colors[0] = this.panel.colors[2];
        this.panel.colors[2] = tmp;
        this.render();
    };
    SingleStatMathCtrl.prototype.onColorChange = function (panelColorIndex) {
        var _this = this;
        return function (color) {
            _this.panel.colors[panelColorIndex] = color;
            _this.render();
        };
    };
    SingleStatMathCtrl.prototype.onSparklineColorChange = function (newColor) {
        this.panel.sparkline.lineColor = newColor;
        this.render();
    };
    SingleStatMathCtrl.prototype.onSparklineFillChange = function (newColor) {
        this.panel.sparkline.fillColor = newColor;
        this.render();
    };
    SingleStatMathCtrl.prototype.getDecimalsForValue = function (value) {
        if (lodash_1["default"].isNumber(this.panel.decimals)) {
            return { decimals: this.panel.decimals, scaledDecimals: null };
        }
        var delta = value / 2;
        var dec = -Math.floor(Math.log(delta) / Math.LN10);
        var magn = Math.pow(10, -dec), norm = delta / magn, // norm is between 1.0 and 10.0
        size;
        if (norm < 1.5) {
            size = 1;
        }
        else if (norm < 3) {
            size = 2;
            // special case for 2.5, requires an extra decimal
            if (norm > 2.25) {
                size = 2.5;
                ++dec;
            }
        }
        else if (norm < 7.5) {
            size = 5;
        }
        else {
            size = 10;
        }
        size *= magn;
        // reduce starting decimals if not needed
        if (Math.floor(value) === value) {
            dec = 0;
        }
        var result = {};
        result.decimals = Math.max(0, dec);
        result.scaledDecimals = result.decimals - Math.floor(Math.log(size) / Math.LN10) + 2;
        return result;
    };
    SingleStatMathCtrl.prototype.setValues = function (data) {
        var _this = this;
        data.flotpairs = [];
        if (this.series.length > 1 || this.panel.math.length) {
            var lastPoint_1 = [];
            var lastValue_1 = [];
            this.series.forEach(function (element, index) {
                lastPoint_1[index] = lodash_1["default"].last(element.datapoints);
                lastValue_1[index] = lodash_1["default"].isArray(lastPoint_1[index]) ? lastPoint_1[index][0] : null;
            });
            if (this.panel.valueName === 'name') {
                data.value = 0;
                data.valueRounded = 0;
                data.valueFormatted = this.series[0].alias;
            }
            else if (lodash_1["default"].isString(lastValue_1[0])) {
                data.value = 0;
                data.valueFormatted = lodash_1["default"].escape(lastValue_1[0]);
                data.valueRounded = 0;
            }
            else if (this.panel.valueName === 'last_time') {
                var formatFunc = kbn_1["default"].valueFormats[this.panel.format];
                data.value = lastPoint_1[0][1];
                data.valueRounded = data.value;
                data.valueFormatted = formatFunc(data.value, 0, 0);
            }
            else {
                if (this.panel.math.length) {
                    var mathFunction = this.panel.math;
                    this.series.forEach(function (element) {
                        mathFunction = mathFunction.replace(new RegExp(element.alias, 'gi'), String(element.stats[_this.panel.valueName]));
                    });
                    try {
                        mathFunction = mathFunction.replace(new RegExp('[A-za-z]+', 'gi'), String(0));
                        data.value = math_1["default"].eval(mathFunction);
                        data.flotpairs = this.series[0].flotpairs;
                    }
                    catch (e) {
                        //Error evaluating function. Defaulting to zero.
                        data.value = 0;
                        data.flotpairs = [0, 0];
                    }
                }
                else {
                    data.value = this.series[0].stats[this.panel.valueName];
                    data.flotpairs = this.series[0].flotpairs;
                }
                var decimalInfo = this.getDecimalsForValue(data.value);
                var formatFunc = kbn_1["default"].valueFormats[this.panel.format];
                data.valueFormatted = formatFunc(data.value, decimalInfo.decimals, decimalInfo.scaledDecimals);
                data.valueRounded = kbn_1["default"].roundValue(data.value, decimalInfo.decimals);
            }
            // Add $__name variable for using in prefix or postfix
            if (this.series && this.series.length > 0) {
                data.scopedVars = lodash_1["default"].extend({}, this.panel.scopedVars);
                data.scopedVars['__name'] = { value: this.series[0].label };
            }
        }
        if (this.series && this.series.length > 0 && this.series.length < 2 && !this.panel.math.length) {
            var lastPoint = lodash_1["default"].last(this.series[0].datapoints);
            var lastValue = lodash_1["default"].isArray(lastPoint) ? lastPoint[0] : null;
            if (this.panel.valueName === 'name') {
                data.value = 0;
                data.valueRounded = 0;
                data.valueFormatted = this.series[0].alias;
            }
            else if (lodash_1["default"].isString(lastValue)) {
                data.value = 0;
                data.valueFormatted = lodash_1["default"].escape(lastValue);
                data.valueRounded = 0;
            }
            else if (this.panel.valueName === 'last_time') {
                var formatFunc = kbn_1["default"].valueFormats[this.panel.format];
                data.value = lastPoint[1];
                data.valueRounded = data.value;
                data.valueFormatted = formatFunc(data.value, 0, 0);
            }
            else {
                data.value = this.series[0].stats[this.panel.valueName];
                data.flotpairs = this.series[0].flotpairs;
                var decimalInfo = this.getDecimalsForValue(data.value);
                var formatFunc = kbn_1["default"].valueFormats[this.panel.format];
                data.valueFormatted = formatFunc(data.value, decimalInfo.decimals, decimalInfo.scaledDecimals);
                data.valueRounded = kbn_1["default"].roundValue(data.value, decimalInfo.decimals);
            }
            // Add $__name variable for using in prefix or postfix
            data.scopedVars = lodash_1["default"].extend({}, this.panel.scopedVars);
            data.scopedVars['__name'] = { value: this.series[0].label };
        }
        this.setValueMapping(data);
    };
    SingleStatMathCtrl.prototype.setValueMapping = function (data) {
        // check value to text mappings if its enabled
        if (this.panel.mappingType === 1) {
            for (var i = 0; i < this.panel.valueMaps.length; i++) {
                var map = this.panel.valueMaps[i];
                // special null case
                if (map.value === 'null') {
                    if (data.value === null || data.value === void 0) {
                        data.valueFormatted = map.text;
                        return;
                    }
                    continue;
                }
                // value/number to text mapping
                var value = parseFloat(map.value);
                if (value === data.valueRounded) {
                    data.valueFormatted = map.text;
                    return;
                }
            }
        }
        else if (this.panel.mappingType === 2) {
            for (var i = 0; i < this.panel.rangeMaps.length; i++) {
                var map = this.panel.rangeMaps[i];
                // special null case
                if (map.from === 'null' && map.to === 'null') {
                    if (data.value === null || data.value === void 0) {
                        data.valueFormatted = map.text;
                        return;
                    }
                    continue;
                }
                // value/number to range mapping
                var from = parseFloat(map.from);
                var to = parseFloat(map.to);
                if (to >= data.valueRounded && from <= data.valueRounded) {
                    data.valueFormatted = map.text;
                    return;
                }
            }
        }
        if (data.value === null || data.value === void 0) {
            data.valueFormatted = 'no value';
        }
    };
    SingleStatMathCtrl.prototype.removeValueMap = function (map) {
        var index = lodash_1["default"].indexOf(this.panel.valueMaps, map);
        this.panel.valueMaps.splice(index, 1);
        this.render();
    };
    SingleStatMathCtrl.prototype.addValueMap = function () {
        this.panel.valueMaps.push({ value: '', op: '=', text: '' });
    };
    SingleStatMathCtrl.prototype.removeRangeMap = function (rangeMap) {
        var index = lodash_1["default"].indexOf(this.panel.rangeMaps, rangeMap);
        this.panel.rangeMaps.splice(index, 1);
        this.render();
    };
    SingleStatMathCtrl.prototype.addRangeMap = function () {
        this.panel.rangeMaps.push({ from: '', to: '', text: '' });
    };
    SingleStatMathCtrl.prototype.link = function (scope, elem, attrs, ctrl) {
        var $location = this.$location;
        var linkSrv = this.linkSrv;
        var $timeout = this.$timeout;
        var panel = ctrl.panel;
        var templateSrv = this.templateSrv;
        var data, linkInfo;
        var $panelContainer = elem.find('.panel-container');
        elem = elem.find('.singlestatmath-panel');
        function applyColoringThresholds(value, valueString) {
            if (!panel.colorValue) {
                return valueString;
            }
            var color = getColorForValue(data, value);
            if (color) {
                return '<span style="color:' + color + '">' + valueString + '</span>';
            }
            return valueString;
        }
        function getSpan(className, fontSize, value) {
            value = templateSrv.replace(value, data.scopedVars);
            return '<span class="' + className + '" style="font-size:' + fontSize + '">' + value + '</span>';
        }
        function getBigValueHtml() {
            var body = '<div class="singlestatmath-panel-value-container">';
            if (panel.prefix) {
                var prefix = applyColoringThresholds(data.value, panel.prefix);
                body += getSpan('singlestatmath-panel-prefix', panel.prefixFontSize, prefix);
            }
            var value = applyColoringThresholds(data.value, data.valueFormatted);
            body += getSpan('singlestatmath-panel-value', panel.valueFontSize, value);
            if (panel.postfix) {
                var postfix = applyColoringThresholds(data.value, panel.postfix);
                body += getSpan('singlestatmath-panel-postfix', panel.postfixFontSize, postfix);
            }
            body += '</div>';
            return body;
        }
        function getValueText() {
            var result = panel.prefix ? templateSrv.replace(panel.prefix, data.scopedVars) : '';
            result += data.valueFormatted;
            result += panel.postfix ? templateSrv.replace(panel.postfix, data.scopedVars) : '';
            return result;
        }
        function addGauge() {
            var width = elem.width();
            var height = elem.height();
            // Allow to use a bit more space for wide gauges
            var dimension = Math.min(width, height * 1.3);
            ctrl.invalidGaugeRange = false;
            if (panel.gauge.minValue > panel.gauge.maxValue) {
                ctrl.invalidGaugeRange = true;
                return;
            }
            var plotCanvas = jquery_1["default"]('<div></div>');
            var plotCss = {
                top: '10px',
                margin: 'auto',
                position: 'relative',
                height: height * 0.9 + 'px',
                width: dimension + 'px'
            };
            plotCanvas.css(plotCss);
            var thresholds = [];
            for (var i = 0; i < data.thresholds.length; i++) {
                thresholds.push({
                    value: data.thresholds[i],
                    color: data.colorMap[i]
                });
            }
            thresholds.push({
                value: panel.gauge.maxValue,
                color: data.colorMap[data.colorMap.length - 1]
            });
            var bgColor = config_1["default"].bootData.user.lightTheme ? 'rgb(230,230,230)' : 'rgb(38,38,38)';
            var fontScale = parseInt(panel.valueFontSize) / 100;
            var fontSize = Math.min(dimension / 5, 100) * fontScale;
            // Reduce gauge width if threshold labels enabled
            var gaugeWidthReduceRatio = panel.gauge.thresholdLabels ? 1.5 : 1;
            var gaugeWidth = Math.min(dimension / 6, 60) / gaugeWidthReduceRatio;
            var thresholdMarkersWidth = gaugeWidth / 5;
            var thresholdLabelFontSize = fontSize / 2.5;
            var options = {
                series: {
                    gauges: {
                        gauge: {
                            min: panel.gauge.minValue,
                            max: panel.gauge.maxValue,
                            background: { color: bgColor },
                            border: { color: null },
                            shadow: { show: false },
                            width: gaugeWidth
                        },
                        frame: { show: false },
                        label: { show: false },
                        layout: { margin: 0, thresholdWidth: 0 },
                        cell: { border: { width: 0 } },
                        threshold: {
                            values: thresholds,
                            label: {
                                show: panel.gauge.thresholdLabels,
                                margin: thresholdMarkersWidth + 1,
                                font: { size: thresholdLabelFontSize }
                            },
                            show: panel.gauge.thresholdMarkers,
                            width: thresholdMarkersWidth
                        },
                        value: {
                            color: panel.colorValue ? getColorForValue(data, data.valueRounded) : null,
                            formatter: function () {
                                return getValueText();
                            },
                            font: {
                                size: fontSize,
                                family: '"Helvetica Neue", Helvetica, Arial, sans-serif'
                            }
                        },
                        show: true
                    }
                }
            };
            elem.append(plotCanvas);
            var plotSeries = {
                data: [[0, data.valueRounded]]
            };
            jquery_1["default"].plot(plotCanvas, [plotSeries], options);
        }
        function addSparkline() {
            var width = elem.width() + 20;
            if (width < 30) {
                // element has not gotten it's width yet
                // delay sparkline render
                setTimeout(addSparkline, 30);
                return;
            }
            var height = ctrl.height;
            var plotCanvas = jquery_1["default"]('<div></div>');
            var plotCss = {};
            plotCss.position = 'absolute';
            if (panel.sparkline.full) {
                plotCss.bottom = '5px';
                plotCss.left = '-5px';
                plotCss.width = width - 10 + 'px';
                var dynamicHeightMargin = height <= 100 ? 5 : Math.round(height / 100) * 15 + 5;
                plotCss.height = height - dynamicHeightMargin + 'px';
            }
            else {
                plotCss.bottom = '0px';
                plotCss.left = '-5px';
                plotCss.width = width - 10 + 'px';
                plotCss.height = Math.floor(height * 0.25) + 'px';
            }
            plotCanvas.css(plotCss);
            var options = {
                legend: { show: false },
                series: {
                    lines: {
                        show: true,
                        fill: 1,
                        lineWidth: 1,
                        fillColor: panel.sparkline.fillColor
                    }
                },
                yaxes: { show: false },
                xaxis: {
                    show: false,
                    mode: 'time',
                    min: ctrl.range.from.valueOf(),
                    max: ctrl.range.to.valueOf()
                },
                grid: { hoverable: false, show: false }
            };
            elem.append(plotCanvas);
            var plotSeries = {
                data: data.flotpairs,
                color: panel.sparkline.lineColor
            };
            jquery_1["default"].plot(plotCanvas, [plotSeries], options);
        }
        function render() {
            if (!ctrl.data) {
                return;
            }
            data = ctrl.data;
            // get thresholds
            data.thresholds = panel.thresholds.split(',').map(function (strVale) {
                return Number(strVale.trim());
            });
            data.colorMap = panel.colors;
            var color = '';
            var body = panel.gauge.show ? '' : getBigValueHtml();
            if (panel.colorBackground) {
                if (data.value == null) {
                    color = panel.valueMappingColorBackground;
                } else {
                    color = getColorForValue(data, data.value);
                }
                if (color) {
                    $panelContainer.css('background-color', color);
                    if (scope.fullscreen) {
                        elem.css('background-color', color);
                    }
                    else {
                        elem.css('background-color', '');
                    }
                }
            }
            else {
                $panelContainer.css('background-color', '');
                elem.css('background-color', '');
                panel.circleBackground = false;
            }

            if (panel.circleBackground) {
                let circleHeight = $($panelContainer.height())[0] - 27;
                let circleWidth = $($panelContainer.width())[0];
        
                $($panelContainer).addClass('circle');
                $panelContainer.css('background-color', '');
        
                if (circleWidth >= circleHeight) {
                  elem.css({
                    'border-radius': '50%',
                    width: circleHeight + 'px',
                    height: circleHeight + 'px',
                    'background-color': color,
                  });
                } else {
                  elem.css({
                    'border-radius': '50%',
                    width: circleWidth + 'px',
                    height: circleWidth + 'px',
                    'background-color': color,
                  });
                }
            } else {
                $($panelContainer).removeClass('circle');
                elem.css({ 'border-radius': '0', width: '', height: '' });
            }

            elem.html(body);
            if (panel.sparkline.show) {
                addSparkline();
            }
            if (panel.gauge.show) {
                addGauge();
            }
            elem.toggleClass('pointer', panel.links.length > 0);
            if (panel.links.length > 0) {
                linkInfo = linkSrv.getPanelLinkAnchorInfo(panel.links[0], data.scopedVars);
            }
            else {
                linkInfo = null;
            }
        }
        function hookupDrilldownLinkTooltip() {
            // drilldown link tooltip
            var drilldownTooltip = jquery_1["default"]('<div id="tooltip" class="">hello</div>"');
            elem.mouseleave(function () {
                if (panel.links.length === 0) {
                    return;
                }
                $timeout(function () {
                    drilldownTooltip.detach();
                });
            });
            elem.click(function (evt) {
                if (!linkInfo) {
                    return;
                }
                // ignore title clicks in title
                if (jquery_1["default"](evt).parents('.panel-header').length > 0) {
                    return;
                }
                if (linkInfo.target === '_blank') {
                    window.open(linkInfo.href, '_blank');
                    return;
                }
                if (linkInfo.href.indexOf('http') === 0) {
                    window.location.href = linkInfo.href;
                }
                else {
                    $timeout(function () {
                        $location.url(linkInfo.href);
                    });
                }
                drilldownTooltip.detach();
            });
            elem.mousemove(function (e) {
                if (!linkInfo) {
                    return;
                }
                drilldownTooltip.text('click to go to: ' + linkInfo.title);
                drilldownTooltip.place_tt(e.pageX, e.pageY - 50);
            });
        }
        hookupDrilldownLinkTooltip();
        this.events.on('render', function () {
            render();
            ctrl.renderingCompleted();
        });
    };
    SingleStatMathCtrl.templateUrl = 'public/plugins/blackmirror1-singlestat-math-panel/module.html';
    return SingleStatMathCtrl;
}(sdk_1.MetricsPanelCtrl));
exports.SingleStatMathCtrl = SingleStatMathCtrl;
exports.PanelCtrl = SingleStatMathCtrl;
function getColorForValue(data, value) {
    if (!lodash_1["default"].isFinite(value)) {
        return null;
    }
    for (var i = data.thresholds.length; i > 0; i--) {
        if (value >= data.thresholds[i - 1]) {
            return data.colorMap[i];
        }
    }
    return lodash_1["default"].first(data.colorMap);
}
exports.getColorForValue = getColorForValue;
// export { SingleStatCtrl, SingleStatCtrl as PanelCtrl, getColorForValue };
