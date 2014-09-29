var builder = angular.module("BootstrapBuilder", []);

builder.directive('draggable', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            element.draggable({
                scroll: false,
                helper: function(){
                    return $(this).find("img").clone();
                },
                start: function(e, ui) {
                    ui.helper.css({"z-index": 99});
                },
                stop: function(){
                    $(this).css({top: 0, left: 0});
                }
            });
        }
    };
});

builder.directive('droppable', function($compile){
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.droppable({
                accept: ".draggableChild, .ui-draggable",
                hoverClass: "drop-hover",
                greedy : true,
                drop: function(event, ui) {
                    scope.buildElementOnDOM(ui.draggable, $(this), $compile);
                }
            });
        }
    }
});

builder.controller('ToolBarCtrl', function($scope, $http, $compile){
    $scope.toolbarElements = {};
    $scope.settingsElements = {};
    $scope.existElements = {};

    $http.get("data/Elements.json").success(function(data, status, headers, config){
        $scope.toolbarElements = data;
    });

    $http.get("data/Settings.json").success(function(data, status, headers, config){
        $scope.settingsElements = data;
    });

    $scope.init = function(){
        $("#mainContentWrapper").click(function(){
            $(this).find(".active").removeClass("active");
            $(".hiddenClickedElementToolbar").hide();
            $scope.emptySettingsContainer();
        });

        KeyboardJS.on("delete", null, function(){
            $scope.deleteItem(null);
        });
    };

    $scope.init();

    $scope.buildElementOnDOM = function(elem, dropElem, $compile, returnItem) {
        /** If the element is not new and dragged inside the work area, only move and not create new Object */
        if(!elem.hasClass("draggableChild"))
        {
            elem.appendTo(dropElem);
            $scope.calculateActiveElementPos(elem);
            return;
        }

        var elemOpts = {
                "data-group" : elem.attr("data-group"),
                "data-childName" : elem.attr("data-childName")
            },
            elemObj = $scope.toolbarElements[elemOpts["data-group"]][elemOpts["data-childName"]],
            clonedElem = $(elemObj.htmlElement),
            elemNewID = $scope.generateRandomID(elemOpts["data-group"], elemOpts["data-childName"]);

        elemOpts["id"] = elemNewID;
        /** Assigning the data attributes to the element on the dom */
        clonedElem.attr(elemOpts);
        /** Saving a reference to the object on angular array */
        $scope.existElements[elemNewID] = elemOpts;
        /** Compiling the html string of the new element */
        $compile(clonedElem)($scope);
        /** Inserting the new element to the DOM */
        dropElem.append(clonedElem);

        /** If the item can be dragged inside the work area, lets set it */
        if(clonedElem.attr("insidedrag") != undefined)
        {
            clonedElem.draggable({
                scroll: false,
                stop: function(){ $(this).css({top: 0, left: 0}) }
            });

            clonedElem.click(function(e){
                e.preventDefault();
                e.stopPropagation();
                $scope.itemClick($(this));
            });
        }

        if(returnItem) return clonedElem;
    };

    $scope.emptySettingsContainer = function()
    {
        $("#settingsPanelWrapper .settingsContainer").empty();
    };

    $scope.itemClick = function(elem) {
        var hiddenToolbarTooltip = $(".hiddenClickedElementToolbar");

        if(elem.hasClass("active"))
        {
            hiddenToolbarTooltip.hide();
            elem.removeClass("active");
            $scope.emptySettingsContainer();
        }
        else
        {
            hiddenToolbarTooltip.show();
            $("#mainContentWrapper .active").removeClass("active");
            elem.addClass("active");
            $scope.calculateActiveElementPos(elem);
            $scope.setSettingsByActiveElement();
        }
    };

    $scope.calculateActiveElementPos = function(elem) {
        var hiddenToolbarTooltip = $(".hiddenClickedElementToolbar"),
            elemWidth = elem.outerWidth() > elem.innerWidth() ? elem.outerWidth() : elem.innerWidth(),
            topPos = elem.position().top + elem.outerHeight() - 1,
            leftPos = elem.position().left + elemWidth - hiddenToolbarTooltip.innerWidth() - 2,
            mainWrapperWidth = $("#mainContentWrapper").width();

        if(leftPos > mainWrapperWidth)
        {
            leftPos = mainWrapperWidth - 8;
        }

        hiddenToolbarTooltip.css({
            top: topPos,
            left: leftPos
        });
    };

    $scope.deleteItem = function($event) {
        if($event) $event.stopPropagation();
        $("#mainContentWrapper .active").remove();
        $(".hiddenClickedElementToolbar").hide();
    };

    $scope.duplicateItem = function($event) {
        $event.stopPropagation();
        var activeItem = $("#mainContentWrapper .active"),
            activeItemParent = activeItem.parent(),
            activeItemGroup = activeItem.attr("data-group"),
            activeItemName = activeItem.attr("data-childName"),
            newClonedElement = $($scope.toolbarElements[activeItemGroup][activeItemName].htmlElement);

        newClonedElement.addClass("draggableChild").attr({
            "data-group" : activeItemGroup,
            "data-childName" : activeItemName
        });

        var clonedDomElement = $scope.buildElementOnDOM(newClonedElement, activeItemParent, $compile, true);
        clonedDomElement.click();
    };

    $scope.setSettingsByActiveElement = function() {
        var settingsPanelWrapper = $("#settingsPanelWrapper .settingsContainer"),
            activeElement = $("#mainContentWrapper .active"),
            elementGroup = activeElement.attr("data-group"),
            elementChildName = activeElement.attr("data-childName"),
            activeElementObject = $scope.toolbarElements[elementGroup][elementChildName];

        $scope.emptySettingsContainer();

        for(var i in activeElementObject.settings)
        {
            $scope.setEvents(activeElementObject.settings[i], activeElementObject);
        }
    };

    $scope.generateRandomID = function(groupName, elementName) {
        var stringName = groupName + "_" + elementName + "_" + Math.floor((Math.random() * 10000) + 1);
        if($scope.existElements[stringName])
        {
            stringName = $scope.generateRandomID(groupName, elementName);
        }
        return stringName;
    };

    $scope.addGridChildSpan = function(elem) {
        elem.find(".col-md-4:first").clone(true, true).appendTo(elem);
    };

    $scope.setEvents = function(elementObjectSettings, elementObject){
        var settingsPanelWrapper = $("#settingsPanelWrapper .settingsContainer"),
            activeElement = $("#mainContentWrapper .active"),
            settingParams = $scope.settingsElements[elementObjectSettings],
            clonedElement = $(settingParams.htmlElement).clone(true, true),
            currentChangeSettings = settingParams.change,
            eventType = currentChangeSettings.eventType,
            eventEmitter = currentChangeSettings.eventEmitter,
            attrType = currentChangeSettings.attrType,
            attrName = currentChangeSettings.attrName,
            elementID = activeElement.attr("id");

        if(attrName)
        {
            /** Setting the input name with the current input value */
            clonedElement.find(eventEmitter).val(activeElement.attr(attrName));
        }

        /** Appending the input/element to the settings panel */
        settingsPanelWrapper.append(clonedElement);

        /** Attaching change event to the setting input/element */
        clonedElement.find(eventEmitter).on(eventType, function(){
            var currentValue = $(this).val(),
                elementToChange = elementObject.htmlChangeElement ? activeElement.find(elementObject.htmlChangeElement) : activeElement;

            $scope.existElements[elementID][attrName] = currentValue;

            switch(attrType)
            {
                default:
                case "attribute":
                    elementToChange.attr(attrName, currentValue);
                    break;

                case "css":
                    elementToChange.css(attrName, currentValue);
                    break;

                case "html":
                    elementToChange.html(attrName, currentValue);
                    break;

                case "text":
                    elementToChange.text(currentValue);
                    break;

                case "function":
                    $scope[currentChangeSettings.eventFunction](activeElement);
                    break;
            }
        });
    };
});