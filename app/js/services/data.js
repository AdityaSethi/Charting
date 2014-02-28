var colorsArray = ['#31A763','#7982B9','#F97848','#6298C4','#FDDE7F','#64BB63', '#0E229B', '#A4A1CC'];


angular.module('app.services').factory('Data',['$http', '$rootScope', '$timeout', '$location', '$q', '$route', function ($http, $rootScope, $timeout, $location, $q, $route){

    var Data = {

        cache: {},
        add_data_to_cache:  function (base_url, api_data) {
            this.cache[base_url] = api_data;
            console.log('$$$$$$$$$ CACHE $$$$$$$$$$$');
            console.log(this.cache);
        },
        in_cache: function (base_url) {
            return this.cache[base_url] || null;
        },
        empty_cache: function () {
            console.log('$$$$$$$$$ CACHE EMPTIED $$$$$$$$$$$');
            this.cache = {};
        },

        get_query_params : function (){
            var settings = this.settings;
            return 'origin=' + settings.origin + '&' +
                'dest=' + settings.destination + '&' +
                'from_date=' + settings.startTime + '&' +
                'to_date=' + settings.endTime;
        },

        update_progress: function(){
            var that = this;
            var start_location = $location.path();
            var modal_instance = $modal.open({templateUrl:'/views/modal_content.html',
                backdrop: 'static', keyboard: false });

            (function tick() {
                var progress = that.get_progress().success(function(api_progress_value){
                    if (!api_progress_value.res || api_progress_value.res.percent ===100){
                        $timeout.cancel(stop);
                        modal_instance.close();
                        $rootScope.job_progress = false;
                        $location.path(start_location);
                        that.get_settings();
                    }else{
                        var pr = api_progress_value.res.percent
                        $rootScope.message = api_progress_value.res.message;
                        var type;
                        if (pr < 25) {
                            type = 'success';
                        } else if (pr < 50) {
                            type = 'info';
                        } else if (pr < 75) {
                            type = 'warning';
                        } else {
                            type = 'danger';
                        };
                        $rootScope.dynamicObject = {
                            value: pr,
                            type: type
                        };
                        $timeout(tick, 1000);
                    }
                });
            })();
        },

        get_settings: function(){
            return this.get_base_json('settings/get').success(function(api_data){
                console.log(api_data);
                var settings = Settings.get();
                settings.airline = api_data.response.airline;
                settings.airlines = api_data.response.airlines;
                settings.origin = api_data.response.origin;
                settings.destination = api_data.response.dest;
                settings.startTime = api_data.response.from_date;
                settings.endTime = api_data.response.to_date;
                settings.bookingPriorToDeparture = api_data.response.ap + ' Days';
                settings.lengthOfStay = api_data.response.length_of_stay + ' Days';
                settings.booksOnWeekend = api_data.response.weekend ? 'true' : 'false';
                $route.reload();
            });
        },

        get_plain_query_url: function (path){
            return this.settings.base_url+'/api/'+path;
        },

        get_query_url:  function (path){
            return this.get_plain_query_url(path)+'?'+this.get_query_params();
        },

        get_base_json: function(path){
            var url_calling = this.get_plain_query_url(path);
            return this.get_promise(url_calling)
        },

        get_promise: function(url_calling){
            console.log(url_calling);
            window.recent_api_url = url_calling
            var base_url = url_calling.split('?')[0], cached_data, promise;
            cached_data = this.in_cache(base_url);
            if(cached_data && base_url != '/api/bkg_progress') {
                console.log('$$$$$$$$ FOUND IN CACHE $$$$$$$$$');
                promise = {
                    success: function(callback){
                        callback(cached_data);
                    }
                }
            } else {
                promise = $http.get(url_calling).success(function(api_response){
                    window.recent_api_response = api_response
                });   
                var that = this;
                promise.success(function(api_data){
                    if(base_url != '/api/bkg_progress') {
                        that.add_data_to_cache(base_url, api_data)
                    }
                }); 
            }
             
            if(promise.error) {
                promise.error(function(data, status){
                    if(status == 303){
                        console.log('Status 303, starting progress bar...')
                        $rootScope.job_progress = true;
                    }
                });
            }
            return promise
        },

        get_progress: function(){
            return this.get_base_json('bkg_progress');
        },

        get_json: function(url_part){
            return this.get_promise(this.get_query_url(url_part));
        },

        new_get_json :  function(url_part){
            var that = this;
            if ($rootScope.hasOwnProperty('settings')){
                console.log('Has settings already.');
                return this.get_promise(this.get_query_url(url_part));
            } else {
                var deferred = $q.defer();
                my_promise = $q.when(that.get_settings()).then(function(settings)
                {
                    var my_query_url = that.get_query_url(url_part);
                    console.log('my Q URL'+my_query_url+'Settings:'+settings);
                    return that.get_promise(my_query_url).success(function(api_data){
                        console.log('Api_data'+api_data);
                        return deferred.resolve(api_data);
                    }).error(function(data, status){
                        if(status == 303) {
                            $rootScope.job_progress = true;
                        }
                    })
                })
                my_promise.success = my_promise.then
                return my_promise.promise
            }
        },

        post_json :  function(url_part, postData){
            var url_calling = '/api/' + url_part;
            console.log(url_calling);
            var promise = $http.post(url_calling, postData)
            promise.error(function(data, status){
                if(status == 303){
                    console.log('Status 303, starting progress bar...')
                    $rootScope.job_progress = true;
                }
            });
            this.empty_cache();

            return promise
        },

        post_csv : function(url_part, postData){
            var promise = $http({
                url: url_part,
                method: 'POST',
                data: {file: postData},
                headers: {
                    'Content-Type': 'multipart/form-data'
                }

            }).success(function(response){
                console.log(response)
            }).error(function(error){
                console.log(error)
            });

            return promise;
        },

        get_local: function(path){
            return this.get_promise(path);
        },

        get_graph_series: function (each_api_data, chart_label, api_label, y_label){
            var d = _.toArray(each_api_data);
            for (var j in d){
                d[j][chart_label] = +d[j][api_label] || j;
                d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return d
        },

        get_graph_series_from_obj: function (each_api_data, chart_label, api_label, y_label){
            var d = _.toArray(each_api_data);
            var d_keys = _.keys(each_api_data);
            for (var j in d){
                d[j][chart_label] = +d_keys[j];
                d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return d
        },

        set_y: function(series_data, y_label){
            var d = _.toArray(series_data);
            for (var j in d){
              d[j]['y'] = +(d[j][y_label]).toFixed(1);
            }
            return angular.copy(d)
        },

        get_keys: function(series_data){
            return _.keys(series_data);
        },
        get_names: function(series_data){
          return _.map(series_data,function(x){return x.name})
        },
        get_forward_backward: function(api_data,compare,cluster,category,yaxis){
            var base_json = api_data.res[compare][cluster];
            var forward_json = base_json['forward'][category];
            var backward_json = base_json['backward'][category];
            console.log(forward_json);
            var series = [
                        {
                            name: 'forward',
                            color: colorsArray[0],
                            data: this.get_graph_series_from_obj(forward_json,'x','',yaxis)
                        },
                        {
                            name: 'backward',
                            color: colorsArray[1],
                            data: this.get_graph_series_from_obj(backward_json,'x','',yaxis)
                        }
                    ]
            return series
        },
        get_serieses: function(api_data,choices,options){
            var series_json = api_data;
            console.log(choices);
            for (var el in choices){
                series_json = series_json[choices[el]];
            }
            var computed_series = [];
            for (var el in series_json){
                var this_series = {
                    name: el,
                    data: series_json[el]
                }
                if (options.hasOwnProperty(el)){
                    var series_option = options[el];
                    this_series = $.extend(false, this_series, series_option);
                    if (series_option.hasOwnProperty('data')){
                        var sdata = series_json[el]
                        for (var fn in series_option.data){
                            sdata = series_option.data[fn](sdata)
                        }
                        this_series.data = sdata;
                    }
                }
                computed_series.push(this_series);
            }
            console.log(computed_series);
            return computed_series;
        },

        x_date: function(series_data){
            for (var el in series_data){
                var sd = series_data[el];
                d = new Date(sd.x);
                var utc_date = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                series_data[el].x = utc_date;
            }
            return series_data
        },

        red_negative: function(series_data){
//            var series_data1 = Data.x_date(series_data);
            for (var el in series_data){
                if (series_data[el].y<0){
                    series_data[el].color = '#FBAD71'
                }
            }
            return series_data;
        },

        transform_api : function(api_data){

            var mod_data = angular.copy(api_data);
            var r = mod_data.res

            for (var op1 in r){
                for (var op2 in r[op1]){
                    var kpi = {}
                    for (var year in r[op1][op2]){
                        kpi[year] = angular.copy(r[op1][op2][year]);
                    }

                }
            }
            return mod_data
        }

}
    return Data;
}])

