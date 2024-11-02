let $scope;
let settings;
let attributeService;
let utils;
let translate;

self.onInit = function() {
    self.ctx.ngZone.run(function() {
       init(); 
       self.ctx.detectChanges(true);
    });
};

function init() {
    $scope = self.ctx.$scope;
    attributeService = $scope.$injector.get(self.ctx.servicesMap.get('attributeService'));
    utils = $scope.$injector.get(self.ctx.servicesMap.get('utils'));
    translate = $scope.$injector.get(self.ctx.servicesMap.get('translate'));
    $scope.toastTargetId = 'input-widget' + utils.guid();
    settings = utils.deepClone(self.ctx.settings) || {};
    settings.showLabel = utils.defaultValue(settings.showLabel, true);
    settings.showResultMessage = utils.defaultValue(settings.showResultMessage, true);
    settings.isRequired = utils.defaultValue(settings.isRequired, true);
    $scope.settings = settings;
    $scope.isValidParameter = true;
    $scope.dataKeyDetected = false; 
    $scope.message = translate.instant('widgets.input-widgets.no-entity-selected');
    
    console.log(self.ctx.datasources[0])
    
    $scope.requiredErrorMessage = utils.customTranslation(settings.requiredErrorMessage, settings.requiredErrorMessage) || translate.instant('widgets.input-widgets.entity-attribute-required');
    $scope.labelValue = utils.customTranslation(settings.labelValue, settings.labelValue) || translate.instant('widgets.input-widgets.value');
    
    var validators = [$scope.validators.minLength(settings.minLength),
        $scope.validators.maxLength(settings.maxLength)];
    
    if (settings.isRequired) {
        validators.push($scope.validators.required);
    }
    
    $scope.attributeUpdateFormGroup = $scope.fb.group({
        currentValue: [undefined, validators]
    });

    if (self.ctx.datasources && self.ctx.datasources.length) {
        var datasource = self.ctx.datasources[0];
        if (datasource.type === 'entity') {
            if (datasource.entityType === 'DEVICE') {
                if (datasource.entityType && datasource.entityId) {
                    $scope.entityName = datasource.entityName;
                    if (settings.widgetTitle && settings.widgetTitle.length) {
                        $scope.titleTemplate = utils.customTranslation(settings.widgetTitle, settings.widgetTitle);
                    } else {
                        $scope.titleTemplate = self.ctx.widgetConfig.title;
                    }
    
                    $scope.entityDetected = true;
                }
            } else {
                $scope.message = translate.instant('widgets.input-widgets.not-allowed-entity');
            }
        }
        if (datasource.dataKeys.length) {
            if (datasource.dataKeys[0].type !== "attribute") {
                $scope.isValidParameter = false;
            } else {
                $scope.currentKey = datasource.dataKeys[0].name; 
                $scope.dataKeyType = datasource.dataKeys[0].type;
                $scope.dataKeyDetected = true;
            }
        }
    }

    self.ctx.widgetTitle = utils.createLabelFromDatasource(self.ctx.datasources[0], $scope.titleTemplate);

    $scope.updateAttribute = function () {
        $scope.isFocused = false;
        if ($scope.entityDetected) {
            var datasource = self.ctx.datasources[0];
            var value = $scope.attributeUpdateFormGroup.get('currentValue').value;
            
            if (!$scope.attributeUpdateFormGroup.get('currentValue').value.length) {
                value = null;
            } else {
                try {
                    value = JSON.parse(value); // Parse the value as JSON
                } catch (e) {
                    $scope.showErrorToast(translate.instant('widgets.input-widgets.invalid-json'), 'bottom', 'left', $scope.toastTargetId);
                    return;
                }
            }
            
            let entityType = datasource.entityFilter.entityType
            
            datasource.entityFilter.entityList.forEach((entityId) => {
                attributeService.saveEntityAttributes(
                {entityType: entityType, id: entityId},
                'SHARED_SCOPE',
                [
                    {
                        key: $scope.currentKey, // Use the dynamic key here
                        value
                    }
                ]
            ).subscribe(
                function success() {
                    $scope.originalValue = $scope.attributeUpdateFormGroup.get('currentValue').value;
                    if (settings.showResultMessage) {
                        $scope.showSuccessToast(translate.instant('widgets.input-widgets.update-successful'), 1000, 'bottom', 'left', $scope.toastTargetId);
                    }
                },
                function fail() {
                    if (settings.showResultMessage) {
                        $scope.showErrorToast(translate.instant('widgets.input-widgets.update-failed'), 'bottom', 'left', $scope.toastTargetId);
                    }
                }
                );
            });
        }
    };

    $scope.changeFocus = function () {
        if ($scope.attributeUpdateFormGroup.get('currentValue').value === $scope.originalValue) {
            $scope.isFocused = false;
        }
    }
}

self.onDataUpdated = function() {
    try {
        if ($scope.dataKeyDetected) {
            if (!$scope.isFocused) {
                $scope.originalValue = self.ctx.data[0].data[0][1];
                $scope.attributeUpdateFormGroup.get('currentValue').patchValue($scope.originalValue);
                self.ctx.detectChanges();
            }
        }
    } catch (e) {
        console.log(e);
    }
}

self.onResize = function() {

}

self.typeParameters = function() {
    return {
        maxDatasources: 1,
        maxDataKeys: 1,
        singleEntity: true
    }
}

self.onDestroy = function() {

}
