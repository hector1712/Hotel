(function ($) {
  $.extend($.ui, { monthpicker: { version: "@VERSION" } });
  var PROP_NAME = 'monthpicker';
  var dpuuid = new Date().getTime();
  var instActive;
  function Monthpicker() {
    this.uuid = 0;
    this._curInst = null; 
    this._disabledInputs = []; 
    this._monthpickerShowing = false; 
    this._mainDivId = 'ui-monthpicker-div'; 
    this._triggerClass = 'ui-monthpicker-trigger';
    this._dialogClass = 'ui-monthpicker-dialog'; 
    this.regional = []; 
    this.regional[''] = { 
      prevText: 'Prev', 
      nextText: 'Next', 
      monthNames: ['January','February','March','April','May','June',
        'July','August','September','October','November','December'],
      monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
      dateFormat: 'mm/yy',
      yearSuffix: '' 
    };
    this._defaults = { 
      showOn: 'focus', 
      showAnim: 'fadeIn', 
      buttonText: '...',
      buttonImage: '',
      changeYear: false,
      yearRange: 'c-10:c+10', 
      beforeShow: null, 
      onSelect: null, 
      onChangeYear: null, 
      onClose: null, 
      stepYears: 1, 
      altField: '',
      altFormat: '', 
      disabled: false 
    };
    $.extend(this._defaults, this.regional['']);
    this.dpDiv = bindHover($('<div id="' + this._mainDivId + '" class="ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all"></div>'));
  }
  $.extend(Monthpicker.prototype, {
    markerClassName: 'hasMonthpicker',
    log: function () {
      if (this.debug)
        console.log.apply('', arguments);
    },
    _widgetMonthpicker: function() {
      return this.dpDiv;
    },
    _getInst: function(target) {
      try {
        return $.data(target, PROP_NAME);
      }
      catch (err) {
        throw 'Missing instance data for this monthpicker';
      }
    },
    _get: function(inst, name) {
      return inst.settings[name] !== undefined ?
        inst.settings[name] : this._defaults[name];
    },
    _attachMonthpicker: function(target, settings) {
      // check for settings on the control itself - in namespace 'month:'
      var inlineSettings = null;
      for (var attrName in this._defaults) {
        var attrValue = target.getAttribute('month:' + attrName);
        if (attrValue) {
          inlineSettings = inlineSettings || {};
          try {
            inlineSettings[attrName] = eval(attrValue);
          } catch (err) {
            inlineSettings[attrName] = attrValue;
          }
        }
      }
      var nodeName = target.nodeName.toLowerCase();
      if (!target.id) {
        this.uuid += 1;
        target.id = 'dp' + this.uuid;
      }
      var inst = this._newInst($(target));
      inst.settings = $.extend({}, settings || {}, inlineSettings || {});
      if (nodeName == 'input') {
        this._connectMonthpicker(target, inst);
      }
    },
    _newInst: function(target) {
      var id = target[0].id.replace(/([^A-Za-z0-9_-])/g, '\\\\$1'); // escape jQuery meta chars
      return {id: id, input: target, // associated target
        selectedDay: 0, selectedMonth: 0, selectedYear: 0, // current selection
        drawMonth: 0, drawYear: 0, // month being drawn
        dpDiv: this.dpDiv // presentation div
      };
    },
    _connectMonthpicker: function(target, inst) {
      var input = $(target);
      inst.append = $([]);
      inst.trigger = $([]);
      if (input.hasClass(this.markerClassName))
        return;
      this._attachments(input, inst);
      input.addClass(this.markerClassName).keydown(this._doKeyDown).
        keypress(this._doKeyPress).keyup(this._doKeyUp).
        bind("setData.monthpicker", function(event, key, value) {
          inst.settings[key] = value;
        }).bind("getData.monthpicker", function(event, key) {
          return this._get(inst, key);
        });
      $.data(target, PROP_NAME, inst);
      if( inst.settings.disabled ) {
        this._disableMonthpicker( target );
      }
    },
    _attachments: function(input, inst) {
      input.unbind('focus', this._showMonthpicker);
      if (inst.trigger)
        inst.trigger.remove();
      var showOn = this._get(inst, 'showOn');
      if (showOn == 'focus' || showOn == 'both') 
        input.focus(this._showMonthpicker);
      if (showOn == 'button' || showOn == 'both') { 
        var buttonText = this._get(inst, 'buttonText');
        var buttonImage = this._get(inst, 'buttonImage');
        inst.trigger = $('<img/>').addClass(this._triggerClass).
            attr({ src: buttonImage, alt: buttonText, title: buttonText });
        input['after'](inst.trigger);
        inst.trigger.click(function() {
          if ($.monthpicker._monthpickerShowing && $.monthpicker._lastInput == input[0])
            $.monthpicker._hideMonthpicker();
          else
            $.monthpicker._showMonthpicker(input[0]);
          return false;
        });
      }
    },
        _checkExternalClick: function(event) {
      if (!$.monthpicker._curInst)
        return;
      var $target = $(event.target),
        inst = $.monthpicker._getInst($target[0]);
      if ( ( ( $target[0].id != $.monthpicker._mainDivId &&
          $target.parents('#' + $.monthpicker._mainDivId).length == 0 &&
          !$target.hasClass($.monthpicker.markerClassName) &&
          !$target.hasClass($.monthpicker._triggerClass) &&
          $.monthpicker._monthpickerShowing ) ) ||
        ( $target.hasClass($.monthpicker.markerClassName) && $.monthpicker._curInst != inst ) )
        $.monthpicker._hideMonthpicker();
    },
    _showMonthpicker: function(input) {
      input = input.target || input;
      if (input.nodeName.toLowerCase() != 'input') 
        input = $('input', input.parentNode)[0];
      if ($.monthpicker._isDisabledMonthpicker(input) || $.monthpicker._lastInput == input) 
        return;
      var inst = $.monthpicker._getInst(input);
      if ($.monthpicker._curInst && $.monthpicker._curInst != inst) {
        $.monthpicker._curInst.dpDiv.stop(true, true);
        if ( inst && $.monthpicker._monthpickerShowing ) {
          $.monthpicker._hideMonthpicker( $.monthpicker._curInst.input[0] );
        }
      }
      var beforeShow = $.monthpicker._get(inst, 'beforeShow');
      var beforeShowSettings = beforeShow ? beforeShow.apply(input, [input, inst]) : {};
      if(beforeShowSettings === false){
        //false
        return;
      }
      extendRemove(inst.settings, beforeShowSettings);
      inst.lastVal = null;
      $.monthpicker._lastInput = input;
      $.monthpicker._setDateFromField(inst);
      if ($.monthpicker._inDialog) 
        input.value = '';
      if (!$.monthpicker._pos) { 
        $.monthpicker._pos = $.monthpicker._findPos(input);
        $.monthpicker._pos[1] += input.offsetHeight; 
      }
      var isFixed = false;
      $(input).parents().each(function() {
        isFixed |= $(this).css('position') == 'fixed';
        return !isFixed;
      });
      if (isFixed && $.browser.opera) { 
        $.monthpicker._pos[0] -= document.documentElement.scrollLeft;
        $.monthpicker._pos[1] -= document.documentElement.scrollTop;
      }
      var offset = {left: $.monthpicker._pos[0], top: $.monthpicker._pos[1]};
      $.monthpicker._pos = null;
      inst.dpDiv.empty();
      inst.dpDiv.css({position: 'absolute', display: 'block', top: '-1000px'});
      $.monthpicker._updateMonthpicker(inst);
      offset = $.monthpicker._checkOffset(inst, offset, isFixed);
      inst.dpDiv.css({position: ($.monthpicker._inDialog && $.blockUI ?
        'static' : (isFixed ? 'fixed' : 'absolute')), display: 'none',
        left: offset.left + 'px', top: offset.top + 'px'});
      var showAnim = $.monthpicker._get(inst, 'showAnim');
      var duration = $.monthpicker._get(inst, 'duration');
      var postProcess = function() {
        var cover = inst.dpDiv.find('iframe.ui-monthpicker-cover'); 
        if( !! cover.length ){
          var borders = $.monthpicker._getBorders(inst.dpDiv);
          cover.css({left: -borders[0], top: -borders[1],
            width: inst.dpDiv.outerWidth(), height: inst.dpDiv.outerHeight()});
        }
      };
      inst.dpDiv.zIndex($(input).zIndex()+1);
      $.monthpicker._monthpickerShowing = true;
      if ($.effects && $.effects[showAnim])
        inst.dpDiv.show(showAnim, $.monthpicker._get(inst, 'showOptions'), duration, postProcess);
      else
        inst.dpDiv[showAnim || 'show']((showAnim ? duration : null), postProcess);
      if (!showAnim || !duration)
        postProcess();
      if (inst.input.is(':visible') && !inst.input.is(':disabled'))
        inst.input.focus();
      $.monthpicker._curInst = inst;
    },
    _updateMonthpicker: function(inst) {
      var self = this;
      self.maxRows = 4; 
      var borders = $.monthpicker._getBorders(inst.dpDiv);
      instActive = inst; 
      inst.dpDiv.empty().append(this._generateHTML(inst));
      var cover = inst.dpDiv.find('iframe.ui-monthpicker-cover');
      if( !!cover.length ){ 
        cover.css({left: -borders[0], top: -borders[1], width: inst.dpDiv.outerWidth(), height: inst.dpDiv.outerHeight()})
      }
      inst.dpDiv.find('.' + this._dayOverClass + ' a').mouseover();
      if (inst == $.monthpicker._curInst && $.monthpicker._monthpickerShowing && inst.input &&
          inst.input.is(':visible') && !inst.input.is(':disabled') && inst.input[0] != document.activeElement)
        inst.input.focus();
      if( inst.yearshtml ){
        var origyearshtml = inst.yearshtml;
        setTimeout(function(){
          if( origyearshtml === inst.yearshtml && inst.yearshtml ){
            inst.dpDiv.find('select.ui-monthpicker-year:first').replaceWith(inst.yearshtml);
          }
          origyearshtml = inst.yearshtml = null;
        }, 0);
      }
    },
    _triggerOnClose: function(inst) {
      var onClose = this._get(inst, 'onClose');
      if (onClose)
        onClose.apply((inst.input ? inst.input[0] : null),
                [(inst.input ? inst.input.val() : ''), inst]);
    },
    _hideMonthpicker: function(input) {
      var inst = this._curInst;
      if (!inst || (input && inst != $.data(input, PROP_NAME)))
        return;
      if (this._monthpickerShowing) {
        var showAnim = this._get(inst, 'showAnim');
        var duration = this._get(inst, 'duration');
        var postProcess = function() {
          $.monthpicker._tidyDialog(inst);
          this._curInst = null;
        };
        if ( $.effects && $.effects[ showAnim ] )
          inst.dpDiv.hide(showAnim, $.monthpicker._get(inst, 'showOptions'), duration, postProcess);
        else
          inst.dpDiv[(showAnim == 'slideDown' ? 'slideUp' :
            (showAnim == 'fadeIn' ? 'fadeOut' : 'hide'))]((showAnim ? duration : null), postProcess);
        if (!showAnim)
          postProcess();
        $.monthpicker._triggerOnClose(inst);
        this._monthpickerShowing = false;
        this._lastInput = null;
        if (this._inDialog) {
          this._dialogInput.css({ position: 'absolute', left: '0', top: '-100px' });
          if ($.blockUI) {
            $.unblockUI();
            $('body').append(this.dpDiv);
          }
        }
        this._inDialog = false;
      }
    },
    _isDisabledMonthpicker: function(target) {
      if (!target) {
        return false;
      }
      for (var i = 0; i < this._disabledInputs.length; i++) {
        if (this._disabledInputs[i] == target)
          return true;
      }
      return false;
    },
        _tidyDialog: function(inst) {
      inst.dpDiv.removeClass(this._dialogClass).unbind('.ui-monthpicker-calendar');
    },
    _getBorders: function(elem) {
      var convert = function(value) {
        return {thin: 1, medium: 2, thick: 3}[value] || value;
      };
      return [parseFloat(convert(elem.css('border-left-width'))),
        parseFloat(convert(elem.css('border-top-width')))];
    },
    _checkOffset: function(inst, offset, isFixed) {
      var dpWidth = inst.dpDiv.outerWidth();
      var dpHeight = inst.dpDiv.outerHeight();
      var inputWidth = inst.input ? inst.input.outerWidth() : 0;
      var inputHeight = inst.input ? inst.input.outerHeight() : 0;
      var viewWidth = document.documentElement.clientWidth + $(document).scrollLeft();
      var viewHeight = document.documentElement.clientHeight + $(document).scrollTop();
      offset.left -= (isFixed && offset.left == inst.input.offset().left) ? $(document).scrollLeft() : 0;
      offset.top -= (isFixed && offset.top == (inst.input.offset().top + inputHeight)) ? $(document).scrollTop() : 0;
      offset.left -= Math.min(offset.left, (offset.left + dpWidth > viewWidth && viewWidth > dpWidth) ?
        Math.abs(offset.left + dpWidth - viewWidth) : 0);
      offset.top -= Math.min(offset.top, (offset.top + dpHeight > viewHeight && viewHeight > dpHeight) ?
        Math.abs(dpHeight + inputHeight) : 0);
      return offset;
    },
    _findPos: function(obj) {
      var inst = this._getInst(obj);
      while (obj && (obj.type == 'hidden' || obj.nodeType != 1 || $.expr.filters.hidden(obj))) {
        obj = obj['nextSibling'];
      }
      var position = $(obj).offset();
      return [position.left, position.top];
    },
    _adjustDate: function(id, offset, period) {
      var target = $(id);
      var inst = this._getInst(target[0]);
      if (this._isDisabledMonthpicker(target[0])) {
        return;
      }
      this._adjustInstDate(inst, offset, period);
      this._updateMonthpicker(inst);
    },
    _adjustInstDate: function(inst, offset, period) {
      var year = inst.drawYear + (period == 'Y' ? offset : 0);
      var month = inst.drawMonth + (period == 'M' ? offset : 0);
      var day = 1;
      var date = this._restrictMinMax(inst,
        this._daylightSavingAdjust(new Date(year, month, day)));
      inst.drawMonth = inst.selectedMonth = date.getMonth();
      inst.drawYear = inst.selectedYear = date.getFullYear();
      if (period == 'M' || period == 'Y')
        this._notifyChange(inst);
    },
    _notifyChange: function(inst) {
      var onChange = this._get(inst, 'onChangeYear');
      if (onChange)
        onChange.apply((inst.input ? inst.input[0] : null),
          [inst.selectedYear + 1, inst]);
    },
    _enableMonthpicker: function(target) {
      var $target = $(target);
      var inst = $.data(target, PROP_NAME);
      if (!$target.hasClass(this.markerClassName)) {
        return;
      }
      var nodeName = target.nodeName.toLowerCase();
      if (nodeName == 'input') {
        target.disabled = false;
        inst.trigger.filter('button').
          each(function() { this.disabled = false; }).end().
          filter('img').css({opacity: '1.0', cursor: ''});
      }
      this._disabledInputs = $.map(this._disabledInputs,
        function(value) { return (value == target ? null : value); }); // delete entry
    },
    _disableMonthpicker: function(target) {
      var $target = $(target);
      var inst = $.data(target, PROP_NAME);
      if (!$target.hasClass(this.markerClassName)) {
        return;
      }
      var nodeName = target.nodeName.toLowerCase();
      if (nodeName == 'input') {
        target.disabled = true;
        inst.trigger.filter('button').
          each(function() { this.disabled = true; }).end().
          filter('img').css({opacity: '0.5', cursor: 'default'});
      }
      this._disabledInputs = $.map(this._disabledInputs,
        function(value) { return (value == target ? null : value); }); 
      this._disabledInputs[this._disabledInputs.length] = target;
    },
    _generateHTML: function(inst) {
      var today = new Date();
      today = this._daylightSavingAdjust(
        new Date(today.getFullYear(), today.getMonth(), today.getDate()));
      var currentDate = this._daylightSavingAdjust((!inst.currentMonth ? new Date(9999, 9, 9) :
        new Date(inst.currentYear, inst.currentMonth, 1)));
      var html = '';
      var year = currentDate && currentDate.year ? currentDate.year : 2011;
      var prevText = this._get(inst, 'prevText');
      var nextText = this._get(inst, 'prevText');
      var stepYears = this._get(inst, 'stepYears');
      var monthNames = this._get(inst, 'monthNames');
      var monthNamesShort = this._get(inst, 'monthNamesShort');
      var drawYear = inst.drawYear;
        var prev = '<a class="ui-datepicker-prev ui-corner-all" onclick="MP_jQuery_' + dpuuid +
          '.monthpicker._adjustDate(\'#' + inst.id + '\', -' + stepYears + ', \'Y\');"' +
          ' title="' + prevText + '"><span class="ui-icon ui-icon-circle-triangle-w">' + prevText + '</span></a>';
        var next = '<a class="ui-datepicker-next ui-corner-all" onclick="MP_jQuery_' + dpuuid +
          '.monthpicker._adjustDate(\'#' + inst.id + '\', +' + stepYears + ', \'Y\');"' +
          ' title="' + nextText + '"><span class="ui-icon ui-icon-circle-triangle-e">' + nextText + '</span></a>';
        html += '<div class="ui-datepicker-header ui-widget-header ui-helper-clearfix ui-corner-all">' +
          prev + next + 
          this._generateYearHeader(inst, drawYear, monthNames, monthNamesShort) + // draw month headers
          '</div><table class="ui-datepicker-calendar"><tbody>';
           for(var i=0; i<=11; i++){
        if (i % 3 === 0) {
          html += '<tr>';
        }   
        html += '<td style="padding:1px;cursor:default;" data-month=' + i + '>'
          + '<a  style="text-align: center;" class="ui-state-default'
          + (drawYear == inst.currentYear && i == inst.currentMonth ? ' ui-state-active' : '') 
          + (drawYear == today.getFullYear() && i == today.getMonth() ? ' ui-state-highlight' : '') 
          + '" onclick="MP_jQuery_' + dpuuid + '.monthpicker._selectMonth(\'#'
          + inst.id + '\',' + drawYear + ', ' + i + ');return false;" actionshref="#">' + (inst.settings && inst.settings.monthNamesShort ? inst.settings.monthNamesShort[i] : this._defaults.monthNamesShort[i]) + '</a>' + '</td>'; // display selectable date
        if (i % 3 === 2) {
          html += '</tr>';
        }
      }
      html += '</tbody></table>';
      return html;
    },
      _generateYearHeader: function(inst, drawYear, monthNames, monthNamesShort) {
      var changeYear = this._get(inst, 'changeYear');
      var html = '<div class="ui-datepicker-title">';
      if ( !inst.yearshtml ) {
        inst.yearshtml = '';
        var years = this._get(inst, 'yearRange').split(':');
        var thisYear = new Date().getFullYear();
        var determineYear = function(value) {
          var year = (value.match(/c[+-].*/) ? drawYear + parseInt(value.substring(1), 10) :
            (value.match(/[+-].*/) ? thisYear + parseInt(value, 10) :
            parseInt(value, 10)));
          return (isNaN(year) ? thisYear : year);
        };
        var year = determineYear(years[0]);
        var endYear = Math.max(year, determineYear(years[1] || ''));
        inst.yearshtml += '<select class="ui-datepicker-year" ' +
          'onchange="MP_jQuery_' + dpuuid + '.monthpicker._selectYear(\'#' + inst.id + '\', this, \'Y\');" ' +
          '>';
        for (; year <= endYear; year++) {
          inst.yearshtml += '<option value="' + year + '"' +
            (year == drawYear ? ' selected="selected"' : '') +
            '>' + year + '</option>';
        }
        inst.yearshtml += '</select>';
        
        html += inst.yearshtml;
        inst.yearshtml = null;
      }
      html += this._get(inst, 'yearSuffix');
      html += '</div>'; // Close monthpicker_header
      return html;
    },
      _getFormatConfig: function(inst) {
      var shortYearCutoff = this._get(inst, 'shortYearCutoff');
      shortYearCutoff = (typeof shortYearCutoff != 'string' ? shortYearCutoff :
        new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10));
      return {shortYearCutoff: shortYearCutoff,
        dayNamesShort: this._get(inst, 'dayNamesShort'), dayNames: this._get(inst, 'dayNames'),
        monthNamesShort: this._get(inst, 'monthNamesShort'), monthNames: this._get(inst, 'monthNames')};
    },
      _setDateFromField: function(inst, noDefault) {
      if (inst.input.val() == inst.lastVal) {
        return;
      }
      var dateFormat = this._get(inst, 'dateFormat');
      var dates = inst.lastVal = inst.input ? inst.input.val() : null;
      var date, defaultDate;
      date = defaultDate = this._getDefaultDate(inst);
      var settings = this._getFormatConfig(inst);
      try {
        date = this.parseDate(dateFormat, dates, settings) || defaultDate;
      } catch (event) {
        this.log(event);
        dates = (noDefault ? '' : dates);
      }
      inst.selectedMonth = date.getMonth();
      inst.drawYear = inst.selectedYear = date.getFullYear();
      inst.currentMonth = (dates ? date.getMonth() : 0);
      inst.currentYear = (dates ? date.getFullYear() : 0);
      this._adjustInstDate(inst);
    },
    _getDefaultDate: function(inst) {
      return this._restrictMinMax(inst,
        this._determineDate(inst, this._get(inst, 'defaultDate'), new Date()));
    },
    _determineDate: function(inst, date, defaultDate) {
      var offsetNumeric = function(offset) {
        var date = new Date();
        date.setDate(date.getDate() + offset);
        return date;
      };
      var offsetString = function(offset) {
        try {
          return $.monthpicker.parseDate($.monthpicker._get(inst, 'dateFormat'),
            offset, $.monthpicker._getFormatConfig(inst));
        }
        catch (e) {
        }
        var date = (offset.toLowerCase().match(/^c/) ?
          $.monthpicker._getDate(inst) : null) || new Date();
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        var pattern = /([+-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g;
        var matches = pattern.exec(offset);
        while (matches) {
          switch (matches[2] || 'd') {
            case 'd' : case 'D' :
              day += parseInt(matches[1],10); break;
            case 'w' : case 'W' :
              day += parseInt(matches[1],10) * 7; break;
            case 'm' : case 'M' :
              month += parseInt(matches[1],10);
              day = Math.min(day, $.monthpicker._getDaysInMonth(year, month));
              break;
            case 'y': case 'Y' :
              year += parseInt(matches[1],10);
              day = Math.min(day, $.monthpicker._getDaysInMonth(year, month));
              break;
          }
          matches = pattern.exec(offset);
        }
        return new Date(year, month, day);
      };
      var newDate = (date == null || date === '' ? defaultDate : (typeof date == 'string' ? offsetString(date) :
        (typeof date == 'number' ? (isNaN(date) ? defaultDate : offsetNumeric(date)) : new Date(date.getTime()))));
      newDate = (newDate && newDate.toString() == 'Invalid Date' ? defaultDate : newDate);
      if (newDate) {
        newDate.setHours(0);
        newDate.setMinutes(0);
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
      }
      return this._daylightSavingAdjust(newDate);
    },
    _daylightSavingAdjust: function(date) {
      if (!date) return null;
      date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
      return date;
    },
        _getMinMaxDate: function(inst, minMax) {
      return this._determineDate(inst, this._get(inst, minMax + 'Date'), null);
    },
        _restrictMinMax: function(inst, date) {
      var minDate = this._getMinMaxDate(inst, 'min');
      var maxDate = this._getMinMaxDate(inst, 'max');
      var newDate = (minDate && date < minDate ? minDate : date);
      newDate = (maxDate && newDate > maxDate ? maxDate : newDate);
      return newDate;
    },
        _selectYear: function(id, select, period) {
      var target = $(id);
      var inst = this._getInst(target[0]);
      inst['selected' + (period == 'M' ? 'Month' : 'Year')] =
      inst['draw' + (period == 'M' ? 'Month' : 'Year')] =
        parseInt(select.options[select.selectedIndex].value,10);
      this._notifyChange(inst);
      this._adjustDate(target);
    },
    _selectMonth: function(id, year, month) {
      var target = $(id);
      var inst = this._getInst(target[0]);
      inst.selectedMonth = inst.currentMonth = month;
      inst.selectedYear = inst.currentYear = year;
      this._selectDate(id, this._formatDate(inst, inst.currentMonth, inst.currentYear));
    },
    parseDate: function (format, value, settings) {
      if (format == null || value == null)
        throw 'Invalid arguments';
      value = (typeof value == 'object' ? value.toString() : value + '');
      if (value == '')
        return null;
      var shortYearCutoff = (settings ? settings.shortYearCutoff : null) || this._defaults.shortYearCutoff;
      shortYearCutoff = (typeof shortYearCutoff != 'string' ? shortYearCutoff :
          new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10));
      var monthNamesShort = (settings ? settings.monthNamesShort : null) || this._defaults.monthNamesShort;
      var monthNames = (settings ? settings.monthNames : null) || this._defaults.monthNames;
      var year = -1;
      var month = -1;
      var literal = false;
      var lookAhead = function(match) {
        var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
        if (matches)
          iFormat++;
        return matches;
      };
      var getNumber = function(match) {
        var isDoubled = lookAhead(match);
        var size = (match == '@' ? 14 : (match == '!' ? 20 :
          (match == 'y' && isDoubled ? 4 : (match == 'o' ? 3 : 2))));
        var digits = new RegExp('^\\d{1,' + size + '}');
        var num = value.substring(iValue).match(digits);
        if (!num)
          throw 'Missing number at position ' + iValue;
        iValue += num[0].length;
        return parseInt(num[0], 10);
      };
      var getName = function(match, shortNames, longNames) {
        var names = $.map(lookAhead(match) ? longNames : shortNames, function (v, k) {
          return [ [k, v] ];
        }).sort(function (a, b) {
          return -(a[1].length - b[1].length);
        });
        var index = -1;
        $.each(names, function (i, pair) {
          var name = pair[1];
          if (value.substr(iValue, name.length).toLowerCase() == name.toLowerCase()) {
            index = pair[0];
            iValue += name.length;
            return false;
          }
        });
        if (index != -1)
          return index + 1;
        else
          throw 'Unknown name at position ' + iValue;
      };
      var checkLiteral = function() {
        if (value.charAt(iValue) != format.charAt(iFormat))
          throw 'Unexpected literal at position ' + iValue;
        iValue++;
      };
      var iValue = 0;
      for (var iFormat = 0; iFormat < format.length; iFormat++) {
        if (literal)
          if (format.charAt(iFormat) == "'" && !lookAhead("'"))
            literal = false;
          else
            checkLiteral();
        else
          switch (format.charAt(iFormat)) {
            case 'm':
              month = getNumber('m');
              break;
            case 'M':
              month = getName('M', monthNamesShort, monthNames);
              break;
            case 'y':
              year = getNumber('y');
              break;
            case '@':
              var date = new Date(getNumber('@'));
              year = date.getFullYear();
              month = date.getMonth() + 1;
              day = date.getDate();
              break;
            case '!':
              var date = new Date((getNumber('!') - this._ticksTo1970) / 10000);
              year = date.getFullYear();
              month = date.getMonth() + 1;
              break;
            case "'":
              if (lookAhead("'"))
                checkLiteral();
              else
                literal = true;
              break;
            default:
              checkLiteral();
          }
      }
      if (iValue < value.length){
        throw "Extra/unparsed characters found in date: " + value.substring(iValue);
      }
      if (year == -1)
        year = new Date().getFullYear();
      else if (year < 100)
        year += new Date().getFullYear() - new Date().getFullYear() % 100 +
          (year <= shortYearCutoff ? 0 : -100);
      var date = this._daylightSavingAdjust(new Date(year, month - 1, 1));
      if (date.getFullYear() != year || date.getMonth() + 1 != month || date.getDate() != 1)
        throw 'Invalid date'; // E.g. 31/02/00
      return date;
    },
    formatDate: function (format, date, settings) {
      if (!date)
        return '';
      var monthNamesShort = (settings ? settings.monthNamesShort : null) || this._defaults.monthNamesShort;
      var monthNames = (settings ? settings.monthNames : null) || this._defaults.monthNames;
      var lookAhead = function(match) {
        var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
        if (matches)
          iFormat++;
        return matches;
      };
      var formatNumber = function(match, value, len) {
        var num = '' + value;
        if (lookAhead(match))
          while (num.length < len)
            num = '0' + num;
        return num;
      };
      var formatName = function(match, value, shortNames, longNames) {
        return (lookAhead(match) ? longNames[value] : shortNames[value]);
      };
      var output = '';
      var literal = false;
      if (date)
        for (var iFormat = 0; iFormat < format.length; iFormat++) {
          if (literal)
            if (format.charAt(iFormat) == "'" && !lookAhead("'"))
              literal = false;
            else
              output += format.charAt(iFormat);
          else
            switch (format.charAt(iFormat)) {
              case 'm':
                output += formatNumber('m', date.getMonth() + 1, 2);
                break;
              case 'M':
                output += formatName('M', date.getMonth(), monthNamesShort, monthNames);
                break;
              case 'y':
                output += (lookAhead('y') ? date.getFullYear() :
                  (date.getYear() % 100 < 10 ? '0' : '') + date.getYear() % 100);
                break;
              case '@':
                output += date.getTime();
                break;
              case '!':
                output += date.getTime() * 10000 + this._ticksTo1970;
                break;
              case "'":
                if (lookAhead("'"))
                  output += "'";
                else
                  literal = true;
                break;
              default:
                output += format.charAt(iFormat);
            }
        }
      return output;
    },
        _clearDate: function(id) {
      var target = $(id);
      var inst = this._getInst(target[0]);
      this._selectDate(target, '');
    },
    _selectDate: function(id, dateStr) {
      var target = $(id);
      var inst = this._getInst(target[0]);
      dateStr = (dateStr != null ? dateStr : this._formatDate(inst));
      if (inst.input)
        inst.input.val(dateStr);
      this._updateAlternate(inst);
      var onSelect = this._get(inst, 'onSelect');
      if (onSelect)
        onSelect.apply((inst.input ? inst.input[0] : null), [dateStr, inst]);  // trigger custom callback
      else if (inst.input)
        inst.input.trigger('change'); // fire the change event
      this._hideMonthpicker();
      this._lastInput = inst.input[0];
      if (typeof(inst.input[0]) != 'object')
        inst.input.focus(); // restore focus
      this._lastInput = null;
    },
       _updateAlternate: function(inst) {
      var altField = this._get(inst, 'altField');
      if (altField) { // update alternate field too
        var altFormat = this._get(inst, 'altFormat') || this._get(inst, 'dateFormat');
        var date = this._getDate(inst);
        var dateStr = this.formatDate(altFormat, date, this._getFormatConfig(inst));
        $(altField).each(function() { $(this).val(dateStr); });
      }
    },
    _formatDate: function(inst, month, year) {
      if (!month) {
        inst.currentMonth = inst.selectedMonth;
        inst.currentYear = inst.selectedYear;
      }
      var date = (month ? (typeof month == 'object' ? month :
        this._daylightSavingAdjust(new Date(year, month, 1))) :
        this._daylightSavingAdjust(new Date(inst.currentYear, inst.currentMonth, 1)));
      return this.formatDate(this._get(inst, 'dateFormat'), date, this._getFormatConfig(inst));
    }
  });
    function extendRemove(target, props) {
    $.extend(target, props);
    for (var name in props)
      if (props[name] == null || props[name] == undefined)
        target[name] = props[name];
    return target;
  };
  function bindHover(dpDiv) {
    var selector = '.ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a';
    return dpDiv.delegate(selector, 'mouseout', function() {
        $(this).removeClass('ui-state-hover');
        if (this.className.indexOf('ui-datepicker-prev') != -1) $(this).removeClass('ui-datepicker-prev-hover');
        if (this.className.indexOf('ui-datepicker-next') != -1) $(this).removeClass('ui-datepicker-next-hover');
      })
      .delegate(selector, 'mouseover', function(){
        if (!$.monthpicker._isDisabledMonthpicker( instActive.input[0])) {
          $(this).parents('.ui-datepicker-calendar').find('a').removeClass('ui-state-hover');
          $(this).addClass('ui-state-hover');
          if (this.className.indexOf('ui-datepicker-prev') != -1) $(this).addClass('ui-datepicker-prev-hover');
          if (this.className.indexOf('ui-datepicker-next') != -1) $(this).addClass('ui-datepicker-next-hover');
        }
      });
  }
  $.fn.monthpicker = function(options){
        if ( !this.length ) {
      return this;
    }
        if (!$.monthpicker.initialized) {
      $(document).mousedown($.monthpicker._checkExternalClick).
        find('body').append($.monthpicker.dpDiv);
      $.monthpicker.initialized = true;
    }
    var otherArgs = Array.prototype.slice.call(arguments, 1);
    return this.each(function() {
      typeof options == 'string' ?
        $.monthpicker['_' + options + 'Monthpicker'].
          apply($.monthpicker, [this].concat(otherArgs)) :
        $.monthpicker._attachMonthpicker(this, options);
    });
  };
  $.monthpicker = new Monthpicker(); // singleton instance
  $.monthpicker.initialized = false;
  window['MP_jQuery_' + dpuuid] = $;
})(jQuery);
