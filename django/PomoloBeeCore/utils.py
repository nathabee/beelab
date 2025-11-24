from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from .exceptions import APIError

 



def get_object_or_error(model, **filters):
    try:
        return model.objects.get(**filters)
    except model.DoesNotExist:
        raise APIError("404_NOT_FOUND", f"{model.__name__} not found with {filters}", status.HTTP_404_NOT_FOUND)



class BaseSuccessMixin:
    def success(self, data, status_code=status.HTTP_200_OK):
        return Response({
            "status": "success",
            "data": data
        }, status=status_code)


class BaseAPIView(BaseSuccessMixin, APIView):
    pass


class BaseReadOnlyViewSet(BaseSuccessMixin, viewsets.ReadOnlyModelViewSet):
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        model_name = self.queryset.model._meta.model_name + "s"  # pluralize
        return self.success({model_name: serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success(serializer.data)


 