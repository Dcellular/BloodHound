package database

import (
	"github.com/gofrs/uuid"
	"github.com/specterops/bloodhound/src/model"
)

func (s *BloodhoundDB) ListSavedQueries(userID uuid.UUID, order string, filter model.SQLFilter, skip, limit int) (model.SavedQueries, int, error) {
	var (
		queries model.SavedQueries
		count   int64
	)

	cursor := s.Scope(Paginate(skip, limit)).Where("user_id = ?", userID)

	if filter.SQLString != "" {
		cursor = cursor.Where(filter.SQLString, filter.Params)
	}

	if order != "" {
		cursor = cursor.Order(order)
	}

	result := s.db.Where("user_id = ?", userID).Find(&queries).Count(&count)
	if result.Error != nil {
		return queries, 0, result.Error
	}

	result = cursor.Find(&queries)
	return queries, int(count), CheckError(result)
}

func (s *BloodhoundDB) CreateSavedQuery(userID uuid.UUID, name string, query string) (model.SavedQuery, error) {
	savedQuery := model.SavedQuery{
		UserID: userID.String(),
		Name:   name,
		Query:  query,
	}

	return savedQuery, CheckError(s.db.Create(&savedQuery))
}

func (s *BloodhoundDB) DeleteSavedQuery(id int) error {
	return CheckError(s.db.Delete(&model.SavedQuery{}, id))
}

func (s *BloodhoundDB) SavedQueryBelongsToUser(userID uuid.UUID, savedQueryID int) (bool, error) {
	var savedQuery model.SavedQuery
	if result := s.db.First(&savedQuery, savedQueryID); result.Error != nil {
		return false, CheckError(result)
	} else if savedQuery.UserID == userID.String() {
		return true, nil
	} else {
		return false, nil
	}
}
