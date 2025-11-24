from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf.urls import handler404, handler500
 
from django.db import connection
from django.db.utils import OperationalError

def ready(_):
    try:
        connection.cursor()  # no query; just open a connection
        return JsonResponse({"status": "ok", "db": "ok"}, status=200)
    except OperationalError:
        return JsonResponse({"status": "ok", "db": "down"}, status=503)


def custom_404(request, exception=None):
    return JsonResponse({
        "error": {
            "code": "404_NOT_FOUND",
            "message": "The requested endpoint does not exist."
        }
    }, status=404)

def custom_500(request):
    return JsonResponse({
        "error": {
            "code": "500_INTERNAL_ERROR",
            "message": "An unexpected error occurred."
        }
    }, status=500)

handler404 = custom_404
handler500 = custom_500


def health(_):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", health),
    path("ready", ready),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    path("api/user/", include("UserCore.urls")),      # hello, auth, me
    path("api/pomolobee/", include("PomoloBeeCore.urls")),   #   app’s endpoints
    path("api/competence/", include("CompetenceCore.urls")),   #   app’s endpoints
    path("api/beefont/", include("BeeFontCore.urls")),
]

# this is off in docker
#if settings.BYPASS_MEDIA:
#    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# this is used to acess the admin console


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)