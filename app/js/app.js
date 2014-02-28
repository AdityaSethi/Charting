'use strict';


// Modules creation
angular.module('app.controllers', []);
angular.module('app.services', []);
angular.module('app.directives', []);

var chartapp = angular.module('chartApp', ['ngRoute','app.controllers', 'app.services', 'app.directives'])
  .config(function ($routeProvider) {
    $routeProvider
    	.when('/heatmap', {
    		templateUrl: 'partials/heatmap.html', controller: 'heatmapCtrl'
    	})
  		.otherwise({
  			redirectTo: '/heatmap'
  		});
});
