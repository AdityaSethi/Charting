'use strict';

angular.module('app.controllers')
    .controller('heatmapCtrl', function($scope, Data){
    	
    	$scope.page = 'heatmap';
    	$scope.chartid = 'chart1';
    	/*
    	Data.get_local('js/lib/data.json').success(function(api_data){
    		$scope.draw_heatmap(api_data);
    	})
	*/
    	$scope.draw_heatmap = function(data){
			var chart_data = {
		                headcolumnMiddle: [],
		                headrow: [],
		                values: []
		            }
		    for(var i = 0; i < data['data'].length; i++){
		    	console.log(data[i]);
		    }
		}

    });
