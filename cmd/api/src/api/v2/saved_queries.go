package v2

import (
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/specterops/bloodhound/src/api"
	ctx2 "github.com/specterops/bloodhound/src/ctx"
	"github.com/specterops/bloodhound/src/database"
	"github.com/specterops/bloodhound/src/model"
	"gorm.io/gorm/utils"
	"net/http"
	"strconv"
	"strings"
)

func (s Resources) ListSavedQueries(response http.ResponseWriter, request *http.Request) {
	var (
		order         []string
		queryParams   = request.URL.Query()
		sortByColumns = queryParams[api.QueryParameterSortBy]
		savedQueries  model.SavedQueries
		userID        = ctx2.FromRequest(request).AuthCtx.Session.UserID
	)

	for _, column := range sortByColumns {
		var descending bool
		if string(column[0]) == "-" {
			descending = true
			column = column[1:]
		}

		if !savedQueries.IsSortable(column) {
			api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, api.ErrorResponseDetailsNotSortable, request), response)
			return
		}

		if descending {
			order = append(order, column+" desc")
		} else {
			order = append(order, column)
		}

	}

	queryParameterFilterParser := model.NewQueryParameterFilterParser()
	if queryFilters, err := queryParameterFilterParser.ParseQueryParameterFilters(request); err != nil {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, api.ErrorResponseDetailsBadQueryParameterFilters, request), response)
		return
	} else {
		for name, filters := range queryFilters {
			if validPredicates, err := savedQueries.GetValidFilterPredicatesAsStrings(name); err != nil {
				api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, fmt.Sprintf("%s: %s", api.ErrorResponseDetailsColumnNotFilterable, name), request), response)
				return
			} else {
				for i, filter := range filters {
					if !utils.Contains(validPredicates, string(filter.Operator)) {
						api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, fmt.Sprintf("%s: %s %s", api.ErrorResponseDetailsFilterPredicateNotSupported, filter.Name, filter.Operator), request), response)
						return
					}

					queryFilters[name][i].IsStringData = savedQueries.IsString(filter.Name)
				}
			}
		}

		if sqlFilter, err := queryFilters.BuildSQLFilter(); err != nil {
			api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, "error building SQL for filter", request), response)
		} else if skip, err := ParseSkipQueryParameter(queryParams, 0); err != nil {
			api.WriteErrorResponse(request.Context(), ErrBadQueryParameter(request, model.PaginationQueryParameterSkip, err), response)
		} else if limit, err := ParseLimitQueryParameter(queryParams, 10000); err != nil {
			api.WriteErrorResponse(request.Context(), ErrBadQueryParameter(request, model.PaginationQueryParameterLimit, err), response)
		} else if queries, count, err := s.DB.ListSavedQueries(userID, strings.Join(order, ", "), sqlFilter, skip, limit); err != nil {
			api.HandleDatabaseError(request, response, err)
		} else {
			api.WriteResponseWrapperWithPagination(request.Context(), queries, limit, skip, count, http.StatusOK, response)
		}
	}

}

type CreateSavedQueryRequest struct {
	Query string `json:"query"`
	Name  string `json:"name"`
}

func (s Resources) CreateSavedQuery(response http.ResponseWriter, request *http.Request) {
	var (
		createRequest CreateSavedQueryRequest
		userID        = ctx2.FromRequest(request).AuthCtx.Session.UserID
	)

	if err := api.ReadJSONRequestPayloadLimited(&createRequest, request); err != nil {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, err.Error(), request), response)
	} else if createRequest.Name == "" || createRequest.Query == "" {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, "the name and/or query field is empty", request), response)
	} else if savedQuery, err := s.DB.CreateSavedQuery(userID, createRequest.Name, createRequest.Query); err != nil {
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") {
			api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, "duplicate name for saved query: please choose a different name", request), response)
		} else {
			api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusInternalServerError, err.Error(), request), response)
		}
	} else {
		api.WriteBasicResponse(request.Context(), savedQuery, http.StatusCreated, response)
	}
}

func (s Resources) DeleteSavedQuery(response http.ResponseWriter, request *http.Request) {
	var (
		rawSavedQueryID = mux.Vars(request)[api.URIPathVariableSavedQueryID]
		userID          = ctx2.FromRequest(request).AuthCtx.Session.UserID
	)

	if savedQueryID, err := strconv.Atoi(rawSavedQueryID); err != nil {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, api.ErrorResponseDetailsIDMalformed, request), response)
	} else if savedQueryBelongsToUser, err := s.DB.SavedQueryBelongsToUser(userID, savedQueryID); errors.Is(err, database.ErrNotFound) {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusNotFound, "query does not exist", request), response)
	} else if err != nil {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusInternalServerError, api.ErrorResponseDetailsInternalServerError, request), response)
	} else if !savedQueryBelongsToUser {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusBadRequest, "invalid saved_query_id supplied", request), response)
	} else if err := s.DB.DeleteSavedQuery(savedQueryID); errors.Is(err, database.ErrNotFound) {
		// This is an edge case and can only occur if the database has a concurrent operation that deletes the saved query
		// after the check at s.DB.SavedQueryBelongsToUser but before getting here.
		// Still, adding in the same check for good measure.
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusNotFound, "query does not exist", request), response)
	} else if err != nil {
		api.WriteErrorResponse(request.Context(), api.BuildErrorResponse(http.StatusInternalServerError, api.ErrorResponseDetailsInternalServerError, request), response)
	} else {
		response.WriteHeader(http.StatusNoContent)
	}
}
