var builder = angular.module("BootstrapBuilder", []);

builder.directive('draggable', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            element.draggable({
                scroll: false,
                helper: function(){
                    return $(this).find("img").clone()
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
        link: function(scope, element, attrs){
            element.droppable({
                accept: ".draggableChild, .ui-draggable",
                hoverClass: "drop-hover",
                greedy : true,
                drop: function(event, ui){
                    if(!ui.draggable.hasClass("draggableChild"))
                    {
                        ui.draggable.appendTo($(this));
                        return;
                    }

                    var elementGroup = ui.draggable.attr("data-group"),
                        elementChildName = ui.draggable.attr("data-childName"),
                        selectedElement = scope.toolbarElements[elementGroup][elementChildName],
                        clonedElement = $(selectedElement.htmlElement) ;

                    clonedElement.attr({
                        "data-group" : elementGroup,
                        "data-childName" : elementChildName
                    });

                    $compile(clonedElement)(scope);
                    $(this).append(clonedElement)
                    scope.setContentEditable(element);

                    if(clonedElement.attr("insidedrag") != undefined)
                    {
                        clonedElement.draggable({
                            scroll: false,
                            stop: function(){
                                $(this).css({top: 0, left: 0});
                            }
                        });

                        clonedElement.click(function(e){
                            e.stopPropagation();
                            scope.itemClick($(this));
                        });
                    }
                }
            });
        }
    }
});

builder.controller('ToolBarCtrl', function($scope, $http){
    $scope.toolbarElements = {};
    $scope.settingsElements = {};

    $http.get("data/Elements.json").success(function(data, status, headers, config){
        $scope.toolbarElements = data;
    });

    $http.get("data/Settings.json").success(function(data, status, headers, config){
        $scope.settingsElements = data;
    });

    $scope.setContentEditable = function(elem){
        //$(elem).find("li, p, span, h1, h2, h3, h4, h5, h6, button, label").attr("contenteditable", true);
    };

    $scope.itemClick = function(elem) {
        var hiddenToolbarTooltip = $(".hiddenClickedElementToolbar"),
            topPos = elem.position().top + elem.outerHeight() - 1,
            leftPos = elem.position().left + elem.outerWidth() - hiddenToolbarTooltip.width() - 2;

        if(elem.hasClass("active"))
        {
            hiddenToolbarTooltip.hide();
            elem.removeClass("active");
            $("#settingsPanelWrapper").empty();
        }
        else
        {
            hiddenToolbarTooltip.show();
            $("#mainContentWrapper .active").removeClass("active");
            elem.addClass("active");
            hiddenToolbarTooltip.css({
                top: topPos,
                left: leftPos
            });

            $scope.setSettingsByActiveElement();
        }
    };

    $scope.deleteItem = function($event) {
        $event.stopPropagation();
        $("#mainContentWrapper .active").remove();
        $(".hiddenClickedElementToolbar").hide();
    };

    $scope.duplicateItem = function($event) {
        $event.stopPropagation();
        var activeItem = $("#mainContentWrapper .active"),
            activeItemParent = activeItem.parent();

        activeItem.clone(true, true).removeClass("active").appendTo(activeItemParent);
    };

    $scope.setSettingsByActiveElement = function() {
        var settingsPanelWrapper = $("#settingsPanelWrapper"),
            activeElement = $("#mainContentWrapper .active"),
            elementGroup = activeElement.attr("data-group"),
            elementChildName = activeElement.attr("data-childName"),
            activeElementObject = $scope.toolbarElements[elementGroup][elementChildName];

        settingsPanelWrapper.empty();

        for(var i in activeElementObject.settings)
        {
            var currentSetting = activeElementObject.settings[i],
                settingParams = $scope.settingsElements[currentSetting],
                htmlElement = $(settingParams.htmlElement);

            settingsPanelWrapper.append(htmlElement);

            htmlElement.off("keyup, change").on("keyup, change", function(e){
                var settingParams = $scope.settingsElements[activeElementObject.settings[i]],
                    currentValue = $(this).find("input").val();

                switch(settingParams.change.attrType)
                {
                    default:
                        activeElement.attr(settingParams.change.attrName, currentValue);
                        break;

                    case "css":
                        activeElement.css(settingParams.change.attrName, currentValue);
                        break;
                }
            });
        }
    };
});