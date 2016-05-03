/*global todomvc, angular, Firebase */
var dateformat = "DD/MM/YYYY";
/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the $firebaseArray service
 * - exposes the model to the template and provides event handlers
 */

var moment = moment;
var _ = _;
var UAParser = UAParser;
var console = console;

var futureDate = function(todo) {
	if (!todo.fromDate) return null;
	if (moment(todo.fromDate, dateformat).diff(moment()) > 0) return true;
	return false;
};

// TODO : generate value if not existing
var uaInfos = new UAParser().getResult();

var key = uaInfos.os.name + "-" + uaInfos.browser.name;

var todoMvc = angular.module('todomvc', [
	'ngAnimate',
	'ngTouch',
	'firebase',
	'ui.bootstrap',
	'ngDraggable',
	'ui.tree',
	'angularMoment',
	'ngSanitize',
	'hc.marked',
	'gantt',
	'gantt.tree',
	'gantt.groups',
	'gantt.movable',
	'gantt.dependencies',
	'ui.select',
	'ngGeolocation'
]);

todoMvc.directive('focus', function($timeout, $parse) {
	return {
		link: function(scope, element, attrs) {
			var model = $parse(attrs.focus);
			scope.$watch(model, function(value) {
				if (value === true) {
					$timeout(function() {
						element[0].focus();
					});
				}
			});
		}
	};
});
todoMvc.config(['markedProvider', function(markedProvider) {
	markedProvider.setOptions({
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: true,
		smartLists: true,
		smartypants: false
	});
}]);

todoMvc.controller('TodoCtrl', ["$scope", "$location", "$firebaseArray", "$firebaseObject", "$uibModal", "$log", "$q", "$rootScope", "Auth","$geolocation", function($scope, $location, $firebaseArray, $firebaseObject, $uibModal, $log, $q, $rootScope, Auth, $geolocation) {

	$rootScope.$log = $log;

	$rootScope.genericObject = {};

	$rootScope.url = 'https://sweltering-torch-9405.firebaseio.com';

	$rootScope.statuses = {
		task: ['toplan', 'todo', 'done', 'waiting', 'canceled', 'urgent'],
		note: ['important', 'treating', 'treated'],
		idea: ['aclasser', 'capitale', 'pourquoipas', 'ajeter', 'exploitée'],
		question: ['posée', 'arepondre','repondue','archive']
	};

	$rootScope.types = _.keys($rootScope.statuses);

	$rootScope.allStatuses = _([]).concat($scope.statuses.task, $scope.statuses.note, $scope.statuses.idea, $scope.statuses.question).value();

	$scope.newvaluelabel = "Nouvelle valeur";

	$rootScope.defaultStatus = {
		task: 'todo',
		note: 'treating',
		idea: 'aclasser',
		question:'posée'
	};

	$rootScope.doneStatus = {
		task: ['done', 'canceled'],
		note: ['treated'],
		idea: ['ajeter', 'exploitée'],
		'question':['archive']
	};

	$rootScope.urgentStatus = {
		task: ['urgent'],
		note: ['important'],
		idea: ['capitale'],
		question:['arepondre']
	};

	$rootScope.infoStatus = {
		task: ['toplan', 'waiting'],
		note: [],
		idea: ['pourquoipas'],
		question:[]
	};

	$rootScope.activeStatus = {
		task: ['todo'],
		note: ['treating'],
		idea: ['aclasser'],
		question:['posée']
	};


	$rootScope.filterTypes = [{
		code: 'type',
		name: 'Type'
	}, {
		code: 'status',
		name: 'Etats'
	}, {
		code: 'person',
		name: 'Personne impliquée'
	}, {
		code: 'project',
		name: 'Projet'
	}, {
		code: 'tag',
		name: 'Tag'
	}, {
		code: 'avecqui',
		name: 'Avec qui ?'
	}, {
		code: 'actor',
		name: 'Qui fait ?'
	}];

	// data for ui

	$scope.filterTypeToList = {
		'type': $scope.types,
		'status': $scope.allStatuses,
		'person': [],
		'project': [],
		'tag': [],
		'avecqui': [],
		'actor': []
	};
	$scope.filterTypeToDefaultValuesFilters = {
		'type': [{
			code: 'all',
			name: 'Tout'
		}],
		'status': [{
			code: 'focus',
			name: 'Pour action'
		}, {
			code: 'activetoday',
			name: 'Actif aujourd hui'
		}, {
			code: 'active',
			name: 'Actif'
		}, {
			code: 'completed',
			name: 'Terminé'
		}, {
			code: 'all',
			name: 'Tout'
		}],
		'person': [{
			code: 'all',
			name: 'Tout'
		}],
		'project': [{
			code: 'all',
			name: 'Tout'
		}],
		'tag': [{
			code: 'all',
			name: 'Tout'
		}],
		'avecqui': [{
			code: 'all',
			name: 'Tout'
		}],
		'actor': [{
			code: 'all',
			name: 'Tout'
		}]
	};

	$scope.icons = {
		'type': "fa-file",
		'status': "fa-line-chart",
		'person': "fa-male",
		'project': "fa-folder-o",
		'avecqui': "fa-users",
		'actor': "fa-user",
		'tag': "fa-tags"
	};


	$rootScope.itemTypeIcon = {
		'task': 'fa-tasks',
		'note': 'fa-file-text',
		'idea': 'fa-lightbulb-o',
		'question': 'fa-question'
	};

	$scope.statusesPriority = {
		"danger": "10",
		"warning": "09",
		"default": "05",
		"info": "00"
	};


	$scope.view = {
		type: 'list'
	};
	$scope.search = [
		"", "", ""
	];

	$scope.titles = ["", "", ""];

	$scope.log = function(a) {
		console.dir(a);
	};

	$scope.filteredTodos = [
		[],
		[],
		[]
	];

	$scope.newTodo = [null, null, null];

	$scope.defaultTodo = {
		type: "task",
	};

	$scope.showAll = {};

	$scope.user = {};

	$scope.detailCollapsed = [{
		detail: null,
		item: null
	}, {
		detail: null,
		item: null
	}, {
		detail: null,
		item: null
	}];

	$scope.order = [
		[],
		[],
		[]
	];

	$scope.expandedNoteListItem = [null, null, null];

	$scope.nextsteps = [];

	$scope.newNotelistItem = [{
		description: ""
	}, {
		description: ""
	}, {
		description: ""
	}];

	$scope.fireref = new Firebase($scope.url);

	$scope.auth = Auth;

	$scope.filter = [];
	$scope.source = "alive";
	$scope.statusColor = {};
	$scope.filterType = [];


	$scope.getStatusesList = function() {
		return _.flatten(_.map(_.keys($scope.statuses), function(key) {
			return _.map($scope.statuses[key], function(val) {
				return {
					type: key,
					status: val
				};
			});
		}));
	};

	$scope.pairsStatusLists = $scope.getStatusesList();

	$scope.countChecked = function(todo) {
		if (!todo.notelist) return "";
		var lengthCompleted = _.filter(todo.notelist, function(item) {
			return item.done;
		}).length;
		if (lengthCompleted > 0) {
			return "" + lengthCompleted + "/" + todo.notelist.length;
		} else {
			return "" + todo.notelist.length;
		}
	};

	$scope.editTitleList = function(a) {
		$scope.titleEdit = a;
		$scope.savePrefs();
	};

	$scope.setFilterType = function(filterType, listId) {
		$scope.filterType[listId] = filterType;
	};



	$scope.removeNoteListItem = function(item, notelistItem) {
		var i = item.notelist.indexOf(notelistItem);
		if (i != -1) {
			item.notelist.splice(i, 1);
		}
	};

	$scope.upNoteListItem = function(item, notelistItem) {
		var i = item.notelist.indexOf(notelistItem);
		if (i != -1 && i > 0) {
			var a = _.cloneDeep(item.notelist[i]);
			item.notelist[i] = item.notelist[i - 1];
			item.notelist[i - 1] = a;
		}
	};
	$rootScope.test = {
		todo: null
	};

	$scope.ontaskClick = function(taskModel) {
		if ($scope.todo) $scope.save($scope.todo);
		$scope.todo = $scope.todos.$getRecord(taskModel.id);
	};

	$scope.recalculateGantt = function() {
		$scope.ganttdata = $scope.buildGanttData($scope.filteredTodos[$scope.listId]);
	};

	$scope.changeViewToGantt = function(listId) {
		$scope.listId = listId;
		$scope.view.type = 'gantt';
		$scope.ganttdata = $scope.buildGanttData($scope.filteredTodos[$scope.listId]);
		$scope.hidedGantt = false;
	};

	$scope.fullScreen = function(todo) {
		console.log("firebaseId : %s", todo.$id);
		$scope.listId = 0;
		$scope.view.type = 'gantt';
		$scope.ganttdata = $scope.buildGanttData([todo]);
		$scope.todo = todo;
		$scope.hidedGantt = true;
	}

	$scope.changeViewToList = function() {
		if ($scope.todo) $scope.save($scope.todo);
		$scope.view.type = 'list';
		$scope.ganttdata = [];
		delete $scope.todo;
		delete $scope.listId;
		delete $scope.item;
	};

	$scope.changeViewToDispItem = function(item) {
		if ($scope.todo) $scope.save($scope.todo);
		delete $scope.todo;
		delete $scope.listId;
		delete $scope.item;
		$scope.item = item;
	};

	$scope.ganttOptions = {
		viewScale: "week",
		headers: ['month', 'week'],
		currentDate: 'line',
		columnMagnet: '1 day',
		taskContent: '<i class=" handle-over fa" ng-class="{\'fa-tasks\':(task.row.model.item.type==\'task\'),' +
			' \'fa-file-text\':(task.row.model.item.type==\'note\'),\'fa-lightbulb-o\':(task.row.model.item.type==\'idea\')}"' +
			' ng-cloak></i><a ng-click="scope.$log.log(task)"  ng-class=\'{strikethrough:scope.isCompleted(task.row.model.item)}\' href>' +
			'  {{task.model.name}}</a>'
	};

	$scope.registerApi = function(api) {
		$scope.ganttApi = api;

		api.tasks.on.change($scope, function(task) {
			var todo = $scope.todos.$getRecord(task.model.id);
			todo.fromDate = moment(task.model.from).format(dateformat);
			todo.toDate = moment(task.model.to).format(dateformat);
			$scope.save(todo);
		});
	};

	$scope.buildGanttData = function(list) {

		var projectTree = [];
		_.each($scope.datas.project, function(project) {
			projectTree.push(project);
		});
		projectTree.push({
			name: "",
			children: []
		});

		projectTree = _.filter(projectTree, function(projectItem) {
			return _.find(list, function(todo) {
				return todo.project == projectItem.name
			})
		});

		var projectList = _.map(projectTree, function(item) {
			return item.name;
		});

		var ret = _.map(_.filter(list, function(item) {
			return projectList.indexOf(item.project) != -1;
		}), function(item) {
			return {
				name: item.description,
				content: "<a href ng-click='scope.ontaskClick(row.model)'><i class='fa fa-user'></i> [" + item.actor + "]" + $scope.labelItem(item, 50) + "</a>",
				id: item.$id,
				item: item,
				parent: item.project,
				tasks: [{
					name: $scope.labelItem(item, 50),
					from: moment(item.fromDate, dateformat),
					to: moment(item.toDate, dateformat),
					id: item.$id,
					classes: "gantt-custom-task-" + $scope.status(item)
				}]
			};
		})
		var ret2 = _.map(projectTree, function(item) {
			return {
				name: item.name,
				content: "<i class='fa fa-cubes'></i> " + item.name,
				children: item.children
			};
		});
		ret = _.union(ret, ret2);
		console.log(ret2);
		return ret;
	};

	$scope.downNoteListItem = function(item, notelistItem) {
		var i = item.notelist.indexOf(notelistItem);
		if (i != -1 && i < item.notelist.length - 1) {
			var a = _.cloneDeep(item.notelist[i]);
			item.notelist[i] = item.notelist[i + 1];
			item.notelist[i + 1] = a;
		}
	};

	$scope.addNoteListItem = function(listId, item) {
		var newItem = {
			description: $scope.newNotelistItem[listId].description,
			important: false,
			done: false,
			comment: ""
		};
		if (!item.notelist) item.notelist = [];
		item.notelist.push(newItem);
		$scope.newNotelistItem[listId].description = "";
		$scope.save(item);
	};

	$scope.collapseNoteListItem = function(listId, notelistItem) {
		$scope.newNotelistItem[listId].description = "";
		if ($scope.expandedNoteListItem[listId] == notelistItem) {
			$scope.expandedNoteListItem[listId] = null;
		} else {
			$scope.expandedNoteListItem[listId] = notelistItem;
		}
	};

	$scope.changeStatusItem = function(item, model, todo) {
		todo.status = item.status;
		todo.type = item.type;
		$scope.save(todo);
	};

	$scope.isCollapsedNoteListItem = function(listId, notelistItem) {
		if (notelistItem == $scope.expandedNoteListItem[listId]) return false;
		else return true;
	};

	$scope.buildLabelNoteListItem = function(string) {
		return _.find(string.split("\n"), function(it) {
			return (it !== null && it.trim() !== "");
		}).substring(0, 100);
	};

	$scope.onDropComplete = function(index, dragged, event, dropped, listId) {

		if ($scope.filter[listId].sort == "customlist") {
			// no effect of not on same list
			if (listId != dragged.listId) return;

			// if on top
			if (dropped == 'top') {  
				_.remove($scope.filter[listId].order, function(item) {
					if (item == dragged.item.$id) return true;
					return false;
				});
				$scope.filter[listId].order.push(dragged.item.$id);
			}
			// if on bottom 
			else if (typeof dropped == 'object') {
				_.remove($scope.filter[listId].order, function(item) {
					if (item == dragged.item.$id) return true;
					return false;
				});
				var newIndex = $scope.filter[listId].order.indexOf(dropped.$id);
				$scope.filter[listId].order.splice(newIndex + 1, 0, dragged.item.$id);
			}
			// else
			else {
				_.remove($scope.filter[listId].order, function(item) {
					if (item == dragged.item.$id) return true;
					return false;
				});
				$scope.filter[listId].order.unshift(dragged.item.$id);
			}
		}
		$scope.savePrefs();
	};


	$rootScope.escapeMySubstring = function(string) {
		return string.replace(new RegExp("^", "mg"), "\r\n  > ") + "\r\n";
	};

	$rootScope.unEscapeString = function(string) {
		return string.replace(new RegExp("^  >", "mg"), "").replace(new RegExp("\\r\\n\\r\\n", "mg"), "\r\n");
	};

	$rootScope.serialize = function(item) {
		var desc = (item.description.trim().slice(0, 1) == "#" ? "" : "# ") + item.description
		var result = desc + "\r\n\r\n";

		if (item.notelist && item.notelist.length) {
			result += "### Liste :\r\n";
			_.each(item.notelist, function(it, index) {
				result += "* " + item.notelist[index].description + "\r\n";
			});
		}

		result += "\r\n### Infos :\r\n";
		if (item.creationDate) result += "* Date de création : " + item.creationDate + "\r\n";
		if (item.modifDate) result += "* Date de dernière modif : " + item.modifDate + "\r\n";
		if (item.fromDate) result += "* Date de début : " + item.fromDate + "\r\n";
		if (item.toDate) result += "* Date de fin : " + item.toDate + "\r\n";
		result += "* type(status) : " + item.type + "(" + item.status + ")\r\n";
		if (item.actor) result += "* Acteur : " + item.actor + "\r\n";
		if (item.project) result += "* Projet : " + item.project + "\r\n";
		if (item.avecqui) result += "* Avec ? : " + item.avecqui + "\r\n";
		if (item.tag) result += "* Tags ? : " + item.tag + "\r\n";

		return result;
	};

	$rootScope.between = function(begString, endString, string) {
		return string.replace(new RegExp(".*" + _.escapeRegExp(begString), "m"), "").replace(new RegExp(_.escapeRegExp(endString) + ".*", "m"), "");
	};

	$scope.buildItemFromNoteListItem = function(todo, notelistItem, listId) {

		var deserializedNoteListItem = {
			description: notelistItem.description,
			comment: "",
			notelist: []
		};

		var now = moment().format(dateformat);

		var newItem = {
			description: deserializedNoteListItem.description,
			comment: "",
			status: todo.status,
			avecqui: [todo.avecqui],
			actor: todo.actor,
			project: todo.project,
			tag: _.cloneDeep(todo.tag),
			notelist: [],
			history: [],
			type: todo.type,
			creationDate: now,
			modifDate: now,
			fromDate: now,
			toDate: moment().add(1, 'month').format(dateformat)
		};
		$scope.todos.$add(newItem);
		$scope.reOrder(listId);
	};

	// main function for lists
	$scope.filteredTodosFn = function(listId) {
		$scope.filteredTodos[listId] = _.orderBy(_.filter($scope.todos,
				_.curry($scope.filterGlobal)($scope.filter[listId])), // 1 filter
			_.curry($scope.sortTasks)($scope.filter[listId])(listId),
			$scope.getSense($scope.filter[listId].sort)); // 2 sort
		return $scope.showAll[listId] ? $scope.filteredTodos[listId] : $scope.filteredTodos[listId].slice(0, 15);
	};


	$scope.sortSense = {
		urgence: 'desc',
		fromDate: 'asc',
		toDate: 'asc',
		modifDate: 'asc',
		recentModifDate: 'desc',
		customlist: 'desc'
	};

	$scope.getSense = function(sort) {
		if (sort) return $scope.sortSense[sort];
		else return "desc";
	};

	$scope.setSortKey = function(key, listId) {
		$scope.filter[listId].sort = key;
		$scope.savePrefs();
		$scope.reOrder(listId);
	};

	$scope.reOrder = function(listId) {
		if (!$scope.filter || !$scope.filter[listId]) return;

		if ($scope.filter[listId].sort == "urgence") {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return $scope.statusesPriority[$scope.status(item)] + item.$id;
			}), "$id");
		} else if ($scope.filter[listId].sort == "fromDate") {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return moment(item.fromDate, dateformat).format("YYYYMMDD") + item.$id;
			}), "$id");
		} else if ($scope.filter[listId].sort == "toDate") {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return moment(item.toDate, dateformat).format("YYYYMMDD") + item.$id;
			}), "$id");
		} else if ($scope.filter[listId].sort == "modifDate") {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return moment(item.modifDate, dateformat).format("YYYYMMDD") + item.$id;
			}), "$id");
		} else if ($scope.filter[listId].sort == "recentModifDate") {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return moment(item.modifDate, dateformat).format("YYYYMMDD") + item.$id;
			}), "$id");
		} else if ($scope.filter[listId].sort == "customlist") {
			// nothing
		} else {
			$scope.filter[listId].order = _.map(_.orderBy($scope.filteredTodos[listId], function(item) {
				return item.$id;
			}), "$id");
		}

	};

	$scope.sortTasks = function(filter, listId, item) {
		return $scope.filter[listId].order.indexOf(item.$id);
	};


	$scope.transformTag = function(name) {
		return {
			name: name
		};
	};

	$scope.remove = function(type, todo) {
		$scope.save(todo);
	};


	$scope.selectNew = function(type, todo, item) {
		if (!$scope.datas[type]) $scope.datas[type] = [];
		if (!_.find($scope.datas[type], {
				name: item.name
			})) {
			$scope.datas[type].push({
				name: item.name
			});
			$scope.datas.$save();
		}
		$scope.save(todo);
	};

	$scope.filterGlobal = function(filter, value) {

		var filterProjects = function(filter, value) {
			if ((!filter.project) || filter.project === "" || filter.project == "all") {
				return true;
			} else {
				if (filter.project == value.project) return true;
				if (filter.projectList && filter.projectList.indexOf(value.project) != -1) return true;
				else return false;
			}
		};


		var filterTags = function(filter, value) {
			if ((!filter.tag) || filter.tag === "" || filter.tag == "all") {
				return true;
			} else {
				if (value.tag && value.tag.indexOf(filter.tag) != -1) return true;
				else return false;
			}
		};

		var filterPersons = function(filter, value) {

			if ((!filter.person) || filter.person === "" || filter.person == "all") {
				return true;
			} else if (filter.person == "me") {
				if (value.actor == "me") return true;
				return false;
			} else {
				if (value.avecqui == filter.person || (value.avecqui && value.avecqui.indexOf && value.avecqui.indexOf(filter.person) != -1) || value.actor == filter.person) return true;
				else return false;
			}
		};

		var filterTypes = function(filter, value) {
			if ((!filter.type) || filter.type === "" || filter.type == "all") {
				return true;
			} else {
				if (value.type == filter.type) return true;
				else return false;
			}
		};

		var filterStatus = function(filter, value) {
			if (_.includes($scope.allStatuses, filter.status)) {
				if (value.status == filter.status) return true;
				return false;
			} else if (filter.status == "focus") {
				if (($scope.activeStatus[value.type].indexOf(value.status) != -1 || $scope.urgentStatus[value.type].indexOf(value.status) != -1) && !$scope.futureDate(value)) return true;
				return false;
			} else if (filter.status == "activetoday") { /* all that is not done and dates around today*/
				if ($scope.doneStatus[value.type].indexOf(value.status) == -1 && !$scope.futureDate(value)) return true;
				return false;
			} else if (filter.status == "active") { /* all that is not done*/
				if ($scope.doneStatus[value.type].indexOf(value.status) == -1) return true;
				return false;
			} else if (filter.status == "completed") { /* all that is done*/
				if ($scope.doneStatus[value.type].indexOf(value.status) != -1) return true;
				return false;
			} else if ((!filter.status) || filter.status == "all") {
				return true;
			}
		};

		var filterActor = function(filter, value) {
			if ((!filter.actor) || filter.actor === "" || filter.actor == "all") {
				return true;
			} else {
				if (value.actor == filter.actor) return true;
				else return false;
			}
		};

		var filterAvecqui = function(filter, value) {
			if ((!filter.avecqui) || filter.avecqui === "" || filter.avecqui == "all") {
				return true;
			} else {
				if (value.avecqui == filter.avecqui || (value.avecqui.indexOf && value.avecqui.indexOf(filter.person) != -1)) return true;
				else return false;
			}
		};

		var filterText = function(filter, value) {
			if (!filter || !filter.search || typeof filter.search != "string" || !filter.search.trim()) return true;
			if (JSON.stringify(value).toLowerCase().indexOf(filter.search.trim().toLowerCase()) != -1) return true;
			return false;
		};

		return filterTypes(filter, value) && filterStatus(filter, value) && filterTags(filter, value) && filterPersons(filter, value) && filterProjects(filter, value) && filterActor(filter, value) && filterAvecqui(filter, value) && filterText(filter, value);
	};

	$scope.typeToList = function(type) {
		return $scope.todos;
	};

	$scope.sendEmail = function(email, todo) {
    	var link = "mailto:"
             + "?subject=" + encodeURIComponent($scope.labelItem(todo))
             + "&body=" + encodeURIComponent(todo.description); 

        window.open(link, 'Mailer');
	 };     
	$scope.count = function(listId, valuetype, value, list) {
		var f = null;

		if (valuetype == 'person') {
			f = function(item) {
				if (item.avecqui == value || (item.avecqui.indexOf && item.avecqui.indexOf(value) != -1) || item.actor == value) return true;
				return false;
			};

		} else if (valuetype == 'tag') {
			f = function(item) {
				if (item.tag && item.tag.indexOf(value) != -1) return true;
				return false;
			};
		} else {
			o = {};
			o[valuetype] = value;

		}
		return _.filter(list, f).length;

	};

	$scope.save = function(item, operation) {
		if ($rootScope.dataloaded) {
			if (_.isUndefined(operation)) operation = "save";
			item.modifDate = moment().format(dateformat);
			$scope.typeToList(item.type)['$' + operation](item);
			$scope.saveDataToLocal();

		}
	};

	$rootScope.longTimeAgoDate = function(todo) {
		if (!todo.modifDate) return false;
		if (moment(todo.modifDate, dateformat).diff(moment().subtract(10, 'days')) > 0) return false;
		return true;
	};

	$rootScope.deadLinedDate = function(todo) {
		if (!todo.toDate) return false;
		if (moment(todo.toDate, dateformat).diff(moment()) < 0) return true;
		return false;
	};

	$rootScope.futureDate = function(todo) {
		if (!todo.fromDate) return null;
		if (moment(todo.fromDate, dateformat).diff(moment()) > 0) return true;
		return false;
	};


	$rootScope.status = function(item) {
		if ($scope.infoStatus[item.type].indexOf(item.status) != -1) return "info";
		else if ($scope.doneStatus[item.type].indexOf(item.status) != -1) return "info";
		else if ($scope.futureDate(item)) return "info";
		else if ($scope.urgentStatus[item.type].indexOf(item.status) != -1) return "danger";
		else if ($scope.deadLinedDate(item) && item.type == "task" && ($scope.activeStatus.task.indexOf(item.status) != -1 || $scope.urgentStatus.task.indexOf(item.status) != -1)) return "danger";
		else if ($scope.longTimeAgoDate(item)) return "warning";
		else return "default";
	};


	$rootScope.labelItem = function(item, characters) {
		var nli = _.find(item.notelist, function(notelistItem) {
			return !notelistItem.done
		});
		return _.find(item.description.split("\n"), function(it) {
			return (it !== null && it.trim() !== "");
		}).substring(0, characters ? characters : 140).replace(/^\#+ /, "") + (nli ? " [" + $scope.buildLabelNoteListItem(nli.description) + "]" : "");
	};

	$scope.changeSource = function(value, listId) {
		if (_.isUndefined(listId)) listId = 0;
		$scope.source = value;
		//$scope.redoPath();
		$scope.route();
		$scope.savePrefs();
	};

	$scope.changeFilter = function(type, value, listId) {
		if (_.isUndefined(listId)) listId = 0;
		if (type == 'status' || type == 'type' || type == 'avecqui' || type == 'project' || type == 'actor' || type == 'person' || type == 'tag') {
			$scope.filter[listId][type] = value;
			if (type == "project") {
				if (value == null) $scope.filter[listId].projects = [];
				else $scope.filter[listId].projectList = $scope.leafs($scope.buildTree("project", $scope.filter[listId].project));
			}
		}
		$scope.reOrder(listId);
		$scope.savePrefs();
		$scope.filterType[listId] = null;
	};

	$scope.oneTypeValue = function(type, value) {
		return _.map(_.filter($scope.datas[type], function(item) {
			return (item.name.toLowerCase().indexOf(value.toLowerCase()) != -1);
		}), function(item) {
			return {
				name: item.name,
				type: type
			};
		});
	};

	$scope.getSearchValues = function(value) {
		return _.union($scope.oneTypeValue("project", value),
			$scope.oneTypeValue("avecqui", value),
			$scope.oneTypeValue("tag", value));
	};

	$scope.selectSearchValue = function(value, listId) {
		if (typeof value == "object") {
			if ($scope.filter[listId].search.type == "project") $scope.changeFilter(value.type, value.name, listId);
			else if ($scope.filter[listId].search.type == "avecqui") $scope.changeFilter("person", value.name, listId);
			else if ($scope.filter[listId].search.type == "tag") $scope.changeFilter("tag", value.name, listId);
			$scope.filter[listId].search = "";
		}
		$scope.reOrder(listId);
		$scope.savePrefs();
	};


	/* return tree of projects or items  without repetition */
	$scope.buildTree = function(type, projectName, list) {
		if (!list) list = [];
		var parent = {
			name: projectName,
			children: []
		};
		var projectDatas = _.find($scope.datas[type], function(item) {
			return item.name == projectName;
		});
		if (projectDatas) {
			list.push(projectName);
			_.each(projectDatas.children, function(item) {
				parent.children.push($scope.buildTree(type, item, list));
			});

		}
		return parent;
	};

	$scope.leafs = function(tree, ret) {
		if (!ret) ret = [];
		ret.push(tree.name);
		_.each(tree.children, function(item) {
			$scope.leafs(item, ret);
		});

		return ret;
	};

	$scope.getOnlyFather = function(trees) {
		return _.filter(trees, function(tree) {
			return _.max(_.map(trees, function(treeToSearch) {
				if (tree == treeToSearch) return 0;
				if ($scope.leafs(treeToSearch).indexOf(tree.name) == -1) return 0;
				return 1;
			})) == 0;
		});
	};

	$scope.savePrefs = function() {
		$scope.prefs.filter = _.keyBy(_.map(_.filter($scope.filter), function(item) {
			var ret = _.cloneDeep(item);
			delete ret.projectList;
			return ret;
		}), function(item) {
			return item.listId;
		});

		$scope.prefs.titles = {
			0: $scope.titles[0],
			1: $scope.titles[1],
			2: $scope.titles[2]
		};

		$scope.prefs.source = $scope.source;
		$scope.prefs.$save();
		$scope.savePrefsToLocal();
	};

	$scope.loadPrefs = function() {
		if (!$scope.prefs) return;
		if ($scope.prefs.source) $scope.source = $scope.prefs.source;
		else $scope.source = 'alive';

		if ($scope.prefs.filter) $scope.filter = [$scope.prefs.filter[0], $scope.prefs.filter[1], $scope.prefs.filter[2]];
		else $scope.filter = [null, null, null];
		_.each([0, 1, 2], function(item){ 
			$scope.reOrder(item);
		});
		// fill listId key
		_.each([0, 1, 2], function(item) {
			if ($scope.filter[item]) $scope.filter[item].listId = item;
		});

		// fill titles
		if ($scope.prefs.titles) {
			$scope.titles = [$scope.prefs.titles[0], $scope.prefs.titles[1], $scope.prefs.titles[2]];
		}

		// build project lists filters (projects are tree, so need to explore sons)
		_.each([0, 1, 2], function(item) {
			if ($scope.filter[item] && $scope.filter[item].project) {
				$scope.filter[item].projectList = $scope.leafs($scope.buildTree("project", $scope.filter[item].project));
			}
		});
	};

	$scope.clearList = function(listId) {
		$scope.filter[listId] = {
			status: "",
			person: "",
			project: "",
			tag: "",
			type: "",
			listId: listId
		};
		$scope.titles[listId] = "";
		$scope.reOrder(listId);
		$scope.savePrefs();
	};

	$scope.saveNamedPrefs = function(name, listId) {
		if (!$scope.savedPrefs) $scope.savePrefs = {};
		if (!$scope.savedPrefs[name]) $scope.savePrefs[name] = {};
		$scope.savePrefs();
		$scope.savedPrefs[name] = {};
		$scope.savedPrefs[name].filter = $scope.prefs.filter[listId] ? $scope.prefs.filter[listId] : null;
		$scope.savedPrefs[name].titles = $scope.prefs.titles[listId] ? $scope.prefs.titles[listId] : "";
		$scope.savedPrefs.$save();
		$scope.savePrefsToLocal();
	};


	$scope.loadNamedPrefs = function(name, listId) {
		if (!$scope.savedPrefs) return;
		if (!$scope.savedPrefs[name]) return;
		$scope.prefs.filter[listId] = _.cloneDeep($scope.savedPrefs[name].filter);
		$scope.prefs.titles[listId] = name;
		$scope.loadPrefs();
		$scope.reOrder(listId);
		$scope.savePrefs();
	};

	$scope.listNamedPrefs = function() {
		var l = _.remove(_.keys($rootScope.savedPrefs), function(item) {
			if (item == "$$conf" || item == "$id" || item == "$priority") return false;
			return true;
		});
		return l;
	};

	$scope.deleteNamedPref = function(name) {
		delete $scope.savedPrefs[name];
		$scope.savedPrefs.$save();
	}

	$scope.removeList = function(listId) {
		delete $scope.filter[listId];
		$scope.savePrefs();
	};

	$scope.authFn = function(authData) {


		if (authData) {
			$rootScope.authData = authData;
			// Bind the todos to the firebase provider.
			$rootScope.archives = $firebaseArray($scope.fireref.child("users").child(authData.uid).child("archives"));

			var datas = $firebaseObject($scope.fireref.child("users").child(authData.uid).child("datas"));
			var todos_list = $firebaseArray($scope.fireref.child("users").child(authData.uid).child("items"));
			var prefs = $firebaseObject($scope.fireref.child("users").child(authData.uid).child("preferences").child(key));
			var savedPrefs = $firebaseObject($scope.fireref.child("users").child(authData.uid).child("savedPrefs"));

			/*should be a done for 5 loading events*/
			var done = {
				todos_list: false,
				datas: false,
				prefs: false,
				savedPrefs: false
			};
			var thenfunc = function(type, d) {
				done[type] = d;
				if (done.todos_list && done.datas && done.prefs && done.savedPrefs) {
					$rootScope.dataloaded = true;

					$rootScope.datas = done.datas;
					$rootScope.todos_list = done.todos_list;
					$rootScope.savedPrefs = done.savedPrefs;
					$rootScope.prefs = done.prefs;

					$scope.saveDataToLocal();
					$scope.route();
				}
			};

			todos_list.$loaded().then(function() {
				thenfunc("todos_list", todos_list);
			});
			datas.$loaded().then(function() {
				thenfunc("datas", datas);
			});
			prefs.$loaded().then(function() {

				thenfunc("prefs", prefs);
			});
			savedPrefs.$loaded().then(function() {
				thenfunc("savedPrefs", savedPrefs);
			});
		} else {
			$rootScope.dataloaded = false;
			$rootScope.authData = undefined;
			$rootScope.todos = [];
			$rootScope.archives = [];
			$rootScope.datas = {};
			$rootScope.savedPrefs = {};
		}
	};


	$scope.savePrefsToLocal = function() {
		if (typeof localStorage != "undefined") {
			localStorage.setItem("tasko-prefs", JSON.stringify({
				filter: $rootScope.prefs.filter,
				titles: $rootScope.prefs.titles
			}));
			localStorage.setItem("tasko-savedPrefs", JSON.stringify(_.mapValues($rootScope.savedPrefs,
				function(value, key) {
					if (key.startsWith("$")) return null;
					else return value;
				})));
		}
	};

	$scope.saveDataToLocal = function() {
		if (typeof localStorage != "undefined") {
			localStorage.setItem("tasko-datas", JSON.stringify({
				avecqui: $rootScope.datas.avecqui,
				project: $rootScope.datas.project,
				tag: $rootScope.datas.tag
			}));
			localStorage.setItem("tasko-todos_list", JSON.stringify($rootScope.todos_list)),
				console.log("data copied")
		}
	};

	$scope.loadOfflineData = function() {
		if (typeof localStorage != "undefined") {
			$rootScope.datas = JSON.parse(localStorage.getItem("tasko-datas"));
			$rootScope.todos_list = JSON.parse(localStorage.getItem("tasko-todos_list"));
			$rootScope.prefs = JSON.parse(localStorage.getItem("tasko-prefs"));
			$rootScope.savedPrefs = JSON.parse(localStorage.getItem("tasko-savedPrefs"));

			if ($rootScope.datas && $rootScope.todos_list && $rootScope.prefs && $rootScope.savedPrefs) $scope.route();
		}
	};

	$scope.auth.$onAuth($scope.authFn);

	/*routing function*/
	$scope.route = function() {

		$scope.filterTypeToList = {
			'type': $scope.types,
			'status': $scope.allStatuses,
			'person': _.map($scope.datas.avecqui, "name"),
			'project': _.map($scope.datas.project, "name"),
			'avecqui': _.map($scope.datas.avecqui, "name"),
			'actor': _.map($scope.datas.avecqui, "name"),
			'tag': _.map($scope.datas.tag, "name"),
		};

		if (!$location.path() || $location.path().trim() == "/") $location.path("/alive");

		if (!$rootScope.dataloaded) {
			if (!_.isUndefined($scope.prefs)) {
				$scope.loadPrefs();
			}
			$rootScope.todos = $scope.todos_list;
		} else {
			var vals = _.filter($location.path().split("/"));
			$scope.source = vals[0];
			if (vals.length >= 3) {
				$scope.detailaction = vals[1];
				$scope.val = vals[2];
			}

			if ($scope.source == "archive") {
				$rootScope.todos = $scope.archives;
			} else {
				$rootScope.todos = $scope.todos_list;
			}

			if ($scope.detailaction == "show" && $scope.val) {
				$scope.item = $scope.todos.$getRecord($scope.val);
			} else {
				delete $scope.item;
			}

			if (_.isUndefined($scope.prefs)) {
				$scope.savePrefs();
			} else {
				$scope.loadPrefs();
			}
		}
	};

	$scope.loadOfflineData();

	$scope.loginDo = function() {
		$scope.message = null;
		$scope.error = null;

		Auth.$authWithPassword({
			email: $scope.user.email,
			password: $scope.user.password
		}).then(function(authData) {
			$rootScope.authData = authData;
		}).catch(function(error) {
			$scope.error = error;
			$scope.message = error.message;
		});
	};
	$scope.loginCancel = function() {

		$scope.message = null;
		$scope.error = null;
		$scope.email = "";
		$scope.password = "";
	};

	$scope.addItem = function(listId, type) {

		// quel type ?
		if (!$scope.newTodo[listId]) {
			var now = moment().format(dateformat);
			$scope.newTodo[listId] = {
				type: type,
				status: $scope.defaultStatus[type],
				description: '',
				actor: $scope.filter[listId].actor ? $scope.filter[listId].actor : "me",
				avecqui: $scope.filter[listId].avecqui ? $scope.filter[listId].avecqui : ($scope.filter[listId].person ? $scope.filter[listId].person : ""),
				project: $scope.filter[listId].project ? $scope.filter[listId].project : "",
				tag: $scope.filter[listId].tag ? [_.clone($scope.filter[listId].tag)] : [],
				comment: '',
				notelist: [],
				history: [],
				creationDate: now,
				modifDate: now,
				fromDate: now,
				toDate: moment().add(1, 'month').format(dateformat)
			};
		} else {
			$scope.newTodo[listId] = null;
			$scope.todo = null;
		}
	};

	$scope.addNewItem = function(listId) {
		$scope.todos.$add($scope.newTodo[listId]).then(function(){
			$scope.saveDataToLocal();
			$scope.newTodo[listId] = null;
			$scope.todo = null;
			$scope.reOrder(listId);			
		});
	};

	$scope.valueChanged = function(item, field, dataField, oldvalue) {
		if (item[field] == $scope.newvaluelabel) {
			$scope.addValue(item, field, dataField, oldvalue);
		}
		$scope.save(item);
	};

	$scope.simpleValueChanged = function(item) {
		$scope.save(item);
	};

	$scope.isCollapsed = function(listId, item) {
		if ($scope.detailCollapsed[listId].item == item) return false;
		return true;
	};

	$scope.collapseDetail = function(listId, detail, item) {
		if (_.isEqual($scope.detailCollapsed[listId], {
				detail: detail,
				item: item
			})) {
			$scope.detailCollapsed[listId] = {
				detail: null,
				item: null
			};
		} else {
			$scope.detailCollapsed[listId] = {
				detail: detail,
				item: item
			};
		}
	};

	$scope.archiveItem = function(item) {
		$scope.typeToList(item.type).$remove(item);
		$scope.archives.$add(item);
	};

	$scope.isCompleted = function(todo) {
		return ($scope.doneStatus[todo.type].indexOf(todo.status) != -1);
	};

	$scope.archiveCompletedItems = function(type) {
		if (_.isUndefined(type)) {
			$scope.archiveCompletedItems('task');
			$scope.archiveCompletedItems('note');
			$scope.archiveCompletedItems('idea');
			$scope.archiveCompletedItems('question');
		} else {
			_.each($scope.typeToList(type), function(item) {
				if ($scope.isCompleted(item)) {
					$scope.archiveItem(item, type);
				}
			});
		}
	};

	$scope.addUser = function() {
		var modalInstance = $uibModal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'ManageUserModalContent.html',
			controller: 'ManageUserModalCtrl',
			size: 'md',
			resolve: {
				newValue: function() {
					return "ok";
				}
			}
		});

		modalInstance.result.then(function(newValue) {}, function() {});
	};

	$scope.addValue = function(item, field, dataField, oldvalue) {
		var modalInstance = $uibModal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'NewValueModalContent.html',
			controller: 'NewValueModalCtrl',
			size: 'md',
			resolve: {
				field: function() {
					return field;
				},
				enableParent: function() {
					return field == "project";
				}
			}
		});

		modalInstance.result.then(function(ret) {
			if (!ret.value.trim()) {
				item[field] = oldvalue;
			} else {

				if (typeof $scope.datas[dataField] == "undefined") $scope.datas[dataField] = [];
				if (!_.find($scope.datas[dataField], function(item) {
						return (item.name == ret.value)
					})) {
					$scope.datas[dataField].push({
						name: ret.value
					});
					if (ret.parent) {
						var item = _.find($scope.datas[dataField], function(parent) {
							return parent.name == ret.parent;
						});
						if (item) {
							if (!item.children) item.children = [];
							item.children.push(ret.value);
						}
					}
					$scope.datas.$save();
				}
				item[field] = ret.value;
				$scope.save(item);
			}
		}, function() {
			item[field] = oldvalue;
			$log.info('Modal dismissed at: ' + new Date());
		});
	};

	$scope.displayNoteListitem = function(item) {
		return ($scope.genericObject[$scope.listId + "displayAll"]) || (!item.done);
	};

	$scope.editItem = function(item, listId, operation) {
		$scope.genericObject[listId + 'fromDate'] = moment(item.fromDate, dateformat).toDate();
		$scope.genericObject[listId + 'toDate'] = moment(item.toDate, dateformat).toDate();
		if ($scope.isCollapsed(listId, item)) $scope.save(item);
		if (typeof item.avecqui == "string") {
			if (item.avecqui == "") item.avecqui = [];
			else item.avecqui = [item.avecqui];
			$scope.save(item);
		}
		if (!item.tag) item.tag = [];
		$scope.collapseDetail(listId, 'edit', item);
	};

	$scope.editItemOrCollapse = function(item, listId, operation) {
		if (_.isUndefined(operation)) operation = 'save';

		if (typeof item.avecqui == "string") {
			if (item.avecqui == "") item.avecqui = [];
			else item.avecqui = [item.avecqui];
			$scope.save(item);
		}
		if (!item.tag) item.tag = [];

		if (_.isEqual($scope.detailCollapsed[listId], {
				item: null,
				detail: null
			})) {
			$scope.genericObject[listId + 'fromDate'] = moment(item.fromDate, dateformat).toDate();
			$scope.genericObject[listId + 'toDate'] = moment(item.toDate, dateformat).toDate();
			$scope.detailCollapsed[listId] = {
				item: item,
				detail: "edit"
			};
		} else if (_.isEqual($scope.detailCollapsed[listId], {
				item: item,
				detail: "edit"
			})) {
			item.fromDate = moment($scope.genericObject[listId + 'fromDate']).format(dateformat);
			item.toDate = moment($scope.genericObject[listId + 'toDate']).format(dateformat);
			$scope.save(item);
			$scope.detailCollapsed[listId] = {
				item: null,
				detail: null
			};
		} else if ($scope.detailCollapsed[listId].item == item) {
			item.fromDate = moment($scope.genericObject[listId + 'fromDate']).format(dateformat);
			item.toDate = moment($scope.genericObject[listId + 'toDate']).format(dateformat);
			$scope.save(item);
			$scope.detailCollapsed[listId] = {
				item: null,
				detail: null
			};
		} else {
			$scope.genericObject[listId + 'fromDate'] = moment(item.fromDate, dateformat).toDate();
			$scope.genericObject[listId + 'toDate'] = moment(item.toDate, dateformat).toDate();
			$scope.detailCollapsed[listId] = {
				item: item,
				detail: "edit"
			};
		}
	};

	$scope.addGeolocationHere = function(item) {
		 $geolocation.getCurrentPosition({
            timeout: 60000
         }).then(function(position) {
         	console.dir(position);
            item.position = {lat:position.coords.latitude, long:position.coords.longitude};
            $scope.save(item);
         });
	};

	$scope.delayTask = function(item, listId) {
		$scope.save(item);


		var modalInstance = $uibModal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'delayModalContent.html',
			controller: function($scope, $uibModalInstance, item) {
				$scope.item = item;
				$scope.cancel = function() {
					$uibModalInstance.dismiss();
				}

				$scope.adjustToDate = function() {
					if (moment(item.toDate, dateformat).isBefore(item.fromDate, dateformat)) {
						item.toDate = moment(item.fromDate, dateformat).add(1, 'weeks').format(dateformat);
					}
				};

				$scope.delay = function(nb, unit) {
					item.fromDate = moment().add(nb, unit).format(dateformat);
					$scope.adjustToDate(listId);
					$uibModalInstance.close(item);
				};

				$scope.duration = function(nb, unit) {
					item.toDate = moment(item.fromDate, dateformat).add(nb, unit).format(dateformat);
					$uibModalInstance.close(item);
				};

				$scope.moment = function(string) {
					if (string == 'now') {
						item.fromDate = moment().format(dateformat);
					}
					$scope.adjustToDate(listId);
					$uibModalInstance.close(item);
				};

			},
			size: 'lg',
			resolve: {
				item: function() {
					return item;
				}
			}
		});

		modalInstance.result.then(function(result) {
			$scope.save(result);
		});
	};

	$scope.getUniqFatherTrees = function(type) {
		var projectList = _.uniq(_.map($scope.datas[type], "name"));
		var listTree = [];

		while (projectList.length > 0) {
			listToRemove = [];
			listTree.push($scope.buildTree(type, projectList[0], listToRemove));
			projectList = _.remove(projectList, function(item) {
				return listToRemove.indexOf(item) == -1;
			});
		}

		return $scope.getOnlyFather(listTree);
	};

	$scope.manageItems = function(type, name) {

		listTree = $scope.getUniqFatherTrees(type);

		var modalInstance = $uibModal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'ManageItems.html',
			controller: 'ManageItemsCtrl',
			size: 'lg',
			resolve: {
				itemList: function() {
					return listTree;
				},
				itemsdesc: function() {
					return {
						name: name,
						type: type
					};
				}
			}
		});
		modalInstance.result.then(function(result) {
			$scope.datas[type] = $scope.buildListFromTree(result, type == "project" ? false : true);

			console.log($scope.datas[type]);
			$scope.datas.$save();
		});
	};
	$scope.buildListFromTree = function(tree, refuseChildren, list) {
		if (!list) list = [];
		_.each(tree, function(item) {
			var newval = {
				name: item.name
			};
			if (!refuseChildren && item.children && item.children.length > 0) {
				newval.children = _.map(item.children, function(it) {
					return it.name;
				});
				$scope.buildListFromTree(item.children, refuseChildren, list);
			}
			list.push(newval);
		});
		return list;
	};

	$scope.includeItem = function(item) {

		if (!item.history) item.history = [];

		var modalInstance = $uibModal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'IncludeModalContent.html',
			controller: 'IncludeModalCtrl',
			size: 'lg',
			resolve: {
				item: function() {
					return item;
				}
			}
		});

		modalInstance.result.then(function(result) {
			if (result.type == "notelist") {
				if (!result.inItem.notelist) result.inItem.notelist = [];
				result.inItem.notelist.push({
					description: $scope.serialize(result.item)
				});
				$scope.save(result.inItem);
				$scope.archiveItem(result.item);
			} else if (result.type == "merge") {
				if (!result.inItem.notelist) result.inItem.notelist = [];
				result.inItem.notelist = _.union(result.inItem.notelist, result.item.notelist);
				result.inItem.description += "\r\n" + result.item.description;
				result.inItem.comment += result.item.comment ? "\r\n" + result.item.comment : "";
				$scope.save(result.inItem);
				$scope.archiveItem(result.item);
			}
		}, function() {

		});


	};

}]);


todoMvc.controller('NewValueModalCtrl', ["$scope", "$uibModalInstance", "$log", "field", "enableParent", function($scope, $uibModalInstance, $log, field, enableParent) {

	$scope.ok = function() {
		$uibModalInstance.close($scope.ret);
	};

	$scope.cancel = function() {
		$uibModalInstance.dismiss('cancel');
	};
	$scope.ret = {};
	$scope.field = field;
	$scope.enableParent = enableParent;
	$scope.parent = false;
}]);



// manageItemsCtrl
todoMvc.controller("ManageItemsCtrl", ["$scope", "$uibModalInstance", "itemList", "itemsdesc", function($scope, $uibModalInstance, itemList, itemsdesc) {
	$scope.itemList = itemList;
	$scope.itemsdesc = itemsdesc;
	$scope.newItem = {};
	$scope.ok = function() {
		$uibModalInstance.close($scope.itemList);
	};

	$scope.cancel = function() {
		$uibModalInstance.dismiss();
	}
	$scope.insertNew = function() {
		$scope.itemList.push({
			name: $scope.newItem.text,
			children: []
		})
		$scope.newItem.text = "";
	};

}]);

// and use it in our controller
todoMvc.controller("IncludeModalCtrl", ["$scope", "$uibModalInstance", "item", function($scope, $uibModalInstance, item) {

	$scope.item = item;
	$scope.search = {
		text: ""
	};
	$scope.searchedItems = [];

	$scope.searchedTodos = function() {
		$scope.searchedItems = _.orderBy(_.filter($scope.todos, function(listedItem) {
			if (_.isEqual(listedItem, $scope.item)) return false;
			if (!$scope.search.text || !$scope.search.text || !$scope.search.text.trim()) return true;
			if (JSON.stringify(listedItem).toLowerCase().indexOf($scope.search.text.trim().toLowerCase()) != -1) return true;
			return false;
		}), "$id", ['desc']);
		return $scope.searchedItems.slice(0, 4);
	};

	$scope.isCompleted = function(item) {
		return ($scope.doneStatus[item.type].indexOf(item.status) != -1);
	};

	$scope.addAsItemList = function(newItem) {
		$uibModalInstance.close({
			type: 'notelist',
			item: $scope.item,
			inItem: newItem
		});
	};

	$scope.merge = function(newItem) {
		$uibModalInstance.close({
			type: 'merge',
			item: $scope.item,
			inItem: newItem
		});
	};

	$scope.cancel = function() {
		$uibModalInstance.dismiss('cancel');
	};

}]);

// and use it in our controller
todoMvc.controller("ManageUserModalCtrl", ["$scope", "$uibModalInstance", "Auth",
	function($scope, $uibModalInstance, Auth) {
		$scope.createUser = function() {
			$scope.message = null;
			$scope.error = null;

			Auth.$createUser({
				email: $scope.email,
				password: $scope.password
			}).then(function(userData) {
				$scope.message = "User created with uid: " + userData.uid;
			}).catch(function(error) {
				$scope.error = error;
			});
		};

		$scope.removeUser = function() {
			$scope.message = null;
			$scope.error = null;

			Auth.$removeUser({
				email: $scope.email,
				password: $scope.password
			}).then(function() {
				$scope.message = "User removed";
			}).catch(function(error) {
				$scope.error = error;
			});
		};

		$scope.ok = function() {
			$uibModalInstance.close($scope.newValue);
		};

		$scope.cancel = function() {
			$uibModalInstance.dismiss('cancel');
		};

	}

]);

todoMvc.factory("Auth", ["$firebaseAuth",
	function($firebaseAuth) {
		var url = 'https://sweltering-torch-9405.firebaseio.com';
		var ref = new Firebase(url);
		return $firebaseAuth(ref);
	}
]);